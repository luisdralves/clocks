const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const infoEl = document.getElementById("info");
const temporalTimeEl = document.getElementById("temporal-time");
const secondLengthEl = document.getElementById("second-length");

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const frameInterval = 1000 / 30;
let lastFrameTime = 0;

// Location state - defaults to Greenwich (will be updated by geolocation)
let latitude = 51.4772;
let longitude = 0;
let locationReady = false;
let hasLoggedInfo = false;

// IP-based geolocation (city-level accuracy)
async function initLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    if (data.latitude && data.longitude) {
      latitude = data.latitude;
      longitude = data.longitude;
      console.log(`IP geolocation: ${data.city}, ${data.country_name}`);
    } else {
      console.warn("IP geolocation failed, using default (Greenwich)");
    }
  } catch (e) {
    console.warn("IP geolocation failed, using default (Greenwich):", e.message);
  }
  locationReady = true;
  requestAnimationFrame(draw);
}

initLocation();

// Format decimal hours to HH:MM:SS string
function formatHours(decimalHours) {
  // Handle negative or >24 hour values
  while (decimalHours < 0) decimalHours += 24;
  while (decimalHours >= 24) decimalHours -= 24;

  const hours = Math.floor(decimalHours);
  const minutes = Math.floor((decimalHours - hours) * 60);
  const seconds = Math.floor(((decimalHours - hours) * 60 - minutes) * 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format temporal seconds to HH:MM:SS string
function formatTemporalTime(temporalSeconds) {
  const totalSeconds = Math.floor(temporalSeconds);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Log all relevant daylight clock information
function logDaylightInfo(date, lat, lon) {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  console.group("Daylight Clock Info");

  console.log(`Location: ${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`);
  console.log(`Date: ${date.toLocaleDateString()}`);
  console.log(`Timezone: UTC${date.getTimezoneOffset() <= 0 ? '+' : ''}${-date.getTimezoneOffset() / 60}`);

  if (isDayAllDay) {
    console.log("Polar day: Sun never sets (midnight sun)");
  } else if (isNightAllDay) {
    console.log("Polar night: Sun never rises");
  } else {
    const solarNoon = (sunrise + sunset) / 2;
    const dayLength = sunset - sunrise;
    const nightLength = 24 - dayLength;

    // Solar midnight is halfway through the night
    // If sunset is at 20:00 and sunrise is at 06:00, solar midnight is at 01:00
    const solarMidnight = (sunset + 24 + sunrise) / 2;

    // Sinusoidal model: temporal_rate = 1 + b*sin(π*progress)
    // where b = (12 - periodLength) * π / (2 * periodLength)
    // At sunrise/sunset: rate = 1 (second = 1 real second)
    // At noon: rate = 1 + b_day, so second = 1/(1 + b_day) real seconds
    // At midnight: rate = 1 + b_night, so second = 1/(1 + b_night) real seconds
    const b_day = (12 - dayLength) * Math.PI / (2 * dayLength);
    const b_night = (12 - nightLength) * Math.PI / (2 * nightLength);
    const noonRate = 1 + b_day;
    const midnightRate = 1 + b_night;

    console.log(`Sunrise: ${formatHours(sunrise)} (real time)`);
    console.log(`Solar noon: ${formatHours(solarNoon)} (real time)`);
    console.log(`Sunset: ${formatHours(sunset)} (real time)`);
    console.log(`Solar midnight: ${formatHours(solarMidnight)} (real time)`);
    console.log(`Day length: ${dayLength.toFixed(2)} real hours`);
    console.log(`Night length: ${nightLength.toFixed(2)} real hours`);
    console.log(`Second at sunrise/sunset: 1.0000 real seconds`);
    console.log(`Second at noon: ${(1 / noonRate).toFixed(4)} real seconds`);
    console.log(`Second at midnight: ${(1 / midnightRate).toFixed(4)} real seconds`);
  }

  console.groupEnd();
}

// Calculate day of year (1-365)
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Calculate solar declination in radians
function getSolarDeclination(dayOfYear) {
  return (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
}

// Calculate sunrise and sunset times in hours (local time)
function getSunTimes(date, lat, lon) {
  const dayOfYear = getDayOfYear(date);
  const declination = getSolarDeclination(dayOfYear);
  const latRad = lat * Math.PI / 180;

  // Hour angle at sunrise/sunset
  const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);

  // Handle polar day/night
  if (cosHourAngle < -1) {
    // Midnight sun - sun never sets
    return { sunrise: 0, sunset: 24, isDayAllDay: true };
  }
  if (cosHourAngle > 1) {
    // Polar night - sun never rises
    return { sunrise: 12, sunset: 12, isNightAllDay: true };
  }

  const hourAngle = Math.acos(cosHourAngle); // radians
  const hourAngleHours = hourAngle * 12 / Math.PI; // convert to hours

  // Solar noon in local time
  // Solar noon at longitude L occurs at 12:00 - L/15 hours UTC
  // Convert to local time by adding timezone offset
  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
  const solarNoon = 12 - (lon / 15) + timezoneOffsetHours;

  const sunrise = solarNoon - hourAngleHours;
  const sunset = solarNoon + hourAngleHours;

  return { sunrise, sunset };
}

// Convert real time to temporal (daylight-based) time using smooth sinusoidal model
// The temporal rate varies continuously: rate = 1 at sunrise/sunset, peaks at noon/midnight
// This ensures seconds smoothly stretch/compress with no discontinuities
// Returns seconds since midnight in temporal time
function getTemporalTime(date, lat, lon) {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  // Handle polar extremes (fall back to linear mapping)
  if (isDayAllDay) {
    const realHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const progress = realHours / 24;
    return (6 * 3600 + progress * 12 * 3600) % (24 * 3600);
  }
  if (isNightAllDay) {
    const realHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const progress = realHours / 24;
    return (18 * 3600 + progress * 12 * 3600) % (24 * 3600);
  }

  const realHours = date.getHours() + date.getMinutes() / 60 +
                    date.getSeconds() / 3600 + date.getMilliseconds() / 3600000;

  const isDay = realHours >= sunrise && realHours < sunset;

  // Sinusoidal model: temporal_rate(t) = 1 + b*sin(π*t/periodLength)
  // where b = (12 - periodLength) * π / (2 * periodLength)
  // Integral from 0 to x: temporalElapsed = x + b*periodLength/π*(1 - cos(πx/periodLength))

  if (isDay) {
    const dayLength = sunset - sunrise;
    const b = (12 - dayLength) * Math.PI / (2 * dayLength);
    const x = realHours - sunrise; // hours since sunrise

    // Temporal hours elapsed since sunrise (using integral of sinusoidal rate)
    const temporalHoursElapsed = x + b * dayLength / Math.PI * (1 - Math.cos(Math.PI * x / dayLength));

    return (6 + temporalHoursElapsed) * 3600;
  } else {
    // Nighttime: need to handle wrap around midnight
    const tomorrowSunrise = getSunTimes(new Date(date.getTime() + 24 * 60 * 60 * 1000), lat, lon).sunrise;
    const yesterdaySunset = getSunTimes(new Date(date.getTime() - 24 * 60 * 60 * 1000), lat, lon).sunset;

    let nightLength, x;

    if (realHours >= sunset) {
      // After sunset, before midnight
      nightLength = (24 - sunset) + tomorrowSunrise;
      x = realHours - sunset;
    } else {
      // After midnight, before sunrise
      nightLength = (24 - yesterdaySunset) + sunrise;
      x = (24 - yesterdaySunset) + realHours;
    }

    const b = (12 - nightLength) * Math.PI / (2 * nightLength);

    // Temporal hours elapsed since sunset (using integral of sinusoidal rate)
    const temporalHoursElapsed = x + b * nightLength / Math.PI * (1 - Math.cos(Math.PI * x / nightLength));

    const temporalSeconds = (18 + temporalHoursElapsed) * 3600;
    return temporalSeconds % (24 * 3600);
  }
}

// Sky color gradient based on temporal time
// Returns RGB color string
function getSkyColor(temporalSeconds) {
  const hour = temporalSeconds / 3600;

  // Define key colors at different times
  const colors = [
    { hour: 0, r: 10, g: 15, b: 40 },      // Midnight - deep dark blue
    { hour: 5, r: 15, g: 20, b: 50 },      // Pre-dawn - still dark
    { hour: 6, r: 255, g: 140, b: 80 },    // Sunrise - orange
    { hour: 7, r: 135, g: 180, b: 220 },   // Morning - light blue
    { hour: 12, r: 85, g: 170, b: 230 },   // Noon - bright sky blue
    { hour: 17, r: 135, g: 180, b: 220 },  // Afternoon - light blue
    { hour: 18, r: 255, g: 100, b: 70 },   // Sunset - orange-red
    { hour: 19, r: 80, g: 50, b: 90 },     // Dusk - purple
    { hour: 21, r: 15, g: 20, b: 50 },     // Night - dark blue
    { hour: 24, r: 10, g: 15, b: 40 },     // Back to midnight
  ];

  // Find surrounding colors and interpolate
  let lower = colors[0];
  let upper = colors[colors.length - 1];

  for (let i = 0; i < colors.length - 1; i++) {
    if (hour >= colors[i].hour && hour < colors[i + 1].hour) {
      lower = colors[i];
      upper = colors[i + 1];
      break;
    }
  }

  const range = upper.hour - lower.hour;
  const t = range > 0 ? (hour - lower.hour) / range : 0;

  const r = Math.round(lower.r + (upper.r - lower.r) * t);
  const g = Math.round(lower.g + (upper.g - lower.g) * t);
  const b = Math.round(lower.b + (upper.b - lower.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

// Determine if color is "light" for contrast purposes
function isLightColor(temporalSeconds) {
  const hour = temporalSeconds / 3600;
  return hour > 6.5 && hour < 17.5;
}

// Get the current length of a temporal second in real seconds
function getCurrentSecondLength(date, lat, lon) {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  if (isDayAllDay || isNightAllDay) {
    return 1.0; // Linear mapping for polar extremes
  }

  const realHours = date.getHours() + date.getMinutes() / 60 +
                    date.getSeconds() / 3600 + date.getMilliseconds() / 3600000;

  const isDay = realHours >= sunrise && realHours < sunset;

  if (isDay) {
    const dayLength = sunset - sunrise;
    const b = (12 - dayLength) * Math.PI / (2 * dayLength);
    const x = realHours - sunrise;
    const rate = 1 + b * Math.sin(Math.PI * x / dayLength);
    return 1 / rate;
  } else {
    const tomorrowSunrise = getSunTimes(new Date(date.getTime() + 24 * 60 * 60 * 1000), lat, lon).sunrise;
    const yesterdaySunset = getSunTimes(new Date(date.getTime() - 24 * 60 * 60 * 1000), lat, lon).sunset;

    let nightLength, x;
    if (realHours >= sunset) {
      nightLength = (24 - sunset) + tomorrowSunrise;
      x = realHours - sunset;
    } else {
      nightLength = (24 - yesterdaySunset) + sunrise;
      x = (24 - yesterdaySunset) + realHours;
    }

    const b = (12 - nightLength) * Math.PI / (2 * nightLength);
    const rate = 1 + b * Math.sin(Math.PI * x / nightLength);
    return 1 / rate;
  }
}

// Spring physics for second hand
let lastTemporalSecond = 0;
let secondSpring = { position: 0, velocity: 0 };
const springStiffness = 2;
const springDamping = 0.4;
const springAcceleration = 0.25;
let springInitialized = false;

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }
  lastFrameTime = currentTime;

  const now = new Date();

  // Log info once when location is ready
  if (locationReady && !hasLoggedInfo) {
    logDaylightInfo(now, latitude, longitude);
    hasLoggedInfo = true;
  }

  const temporalSeconds = getTemporalTime(now, latitude, longitude);

  // Sky background
  const skyColor = getSkyColor(temporalSeconds);
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.4;

  // Determine colors based on time of day
  const isLight = isLightColor(temporalSeconds);
  const faceColor = isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(30, 30, 40, 0.9)";
  const handColor = isLight ? "black" : "white";
  const tickColor = isLight ? "black" : "white";

  // Clock face
  ctx.beginPath();
  ctx.fillStyle = faceColor;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Tick markers
  ctx.strokeStyle = tickColor;
  for (let i = 0; i < 60; i++) {
    const isHour = i % 5 === 0;
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const innerRadius = radius * (isHour ? 0.9 : 0.95);
    ctx.lineWidth = radius * (isHour ? 0.015 : 0.005);
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * innerRadius,
      centerY + Math.sin(angle) * innerRadius
    );
    ctx.lineTo(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    ctx.stroke();
  }

  // Extract temporal time components
  const temporalTotalSeconds = Math.floor(temporalSeconds);
  const temporalSecond = temporalTotalSeconds % 60;
  const temporalTotalMinutes = Math.floor(temporalTotalSeconds / 60);
  const temporalMinute = temporalTotalMinutes % 60;
  const temporalHour = Math.floor(temporalTotalMinutes / 60) % 12;

  // Smooth values for hand positions
  const smoothSeconds = temporalSeconds % 60;
  const smoothMinutes = (temporalSeconds / 60) % 60;
  const smoothHours = (temporalSeconds / 3600) % 12;

  // Spring physics for second hand
  if (!springInitialized) {
    secondSpring.position = temporalSecond;
    lastTemporalSecond = temporalSecond;
    springInitialized = true;
  }

  if (temporalSecond !== lastTemporalSecond) {
    if (lastTemporalSecond === 59 && temporalSecond === 0) {
      secondSpring.position -= 60;
    }
    secondSpring.velocity += springAcceleration;
    lastTemporalSecond = temporalSecond;
  }

  const displacement = temporalSecond - secondSpring.position;
  const springForce = displacement * springStiffness;
  secondSpring.velocity += springForce;
  secondSpring.velocity *= springDamping;
  secondSpring.position += secondSpring.velocity;

  const secondAngle = (secondSpring.position / 60) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (smoothMinutes / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (smoothHours / 12) * Math.PI * 2 - Math.PI / 2;

  // Hour hand
  ctx.beginPath();
  ctx.strokeStyle = handColor;
  ctx.lineWidth = radius * 0.06;
  ctx.lineCap = "round";
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(hourAngle) * radius * 0.5,
    centerY + Math.sin(hourAngle) * radius * 0.5
  );
  ctx.stroke();

  // Minute hand
  ctx.beginPath();
  ctx.lineWidth = radius * 0.04;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(minuteAngle) * radius * 0.7,
    centerY + Math.sin(minuteAngle) * radius * 0.7
  );
  ctx.stroke();

  // Second hand
  ctx.beginPath();
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = radius * 0.02;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(secondAngle) * radius * 0.8,
    centerY + Math.sin(secondAngle) * radius * 0.8
  );
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.fillStyle = handColor;
  ctx.arc(centerX, centerY, radius * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Update info text
  const currentSecondLength = getCurrentSecondLength(now, latitude, longitude);
  temporalTimeEl.textContent = formatTemporalTime(temporalSeconds);
  secondLengthEl.textContent = currentSecondLength.toFixed(5);
  infoEl.style.color = isLight ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)";

  requestAnimationFrame(draw);
}
