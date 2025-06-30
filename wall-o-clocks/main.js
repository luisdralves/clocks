import digits from "./digits.json" with { type: "json" };

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let isPortrait;
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  isPortrait = window.innerHeight > window.innerWidth;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const horixontalN = 28;
const verticalN = 12;
const frameInterval = 1000 / 30;
let lastFrameTime = 0;

const previousState = new Map();
for (let i = 0; i < verticalN; i++) {
  for (let j = 0; j < horixontalN; j++) {
    previousState.set(`${i},${j}`, [(3 * Math.PI) / 2, (3 * Math.PI) / 2, (3 * Math.PI) / 2, 0]);
  }
}

const initialInterpolationFactor = 0.95;
const baseInterpolationFactor = 0.75;
let isInitialAnimationDone = false;
const initialAnimationThreshold = 0.2;

function interpolate(previousValue, nextValue, interpolationFactor) {
  return interpolationFactor * previousValue + (1 - interpolationFactor) * nextValue;
}

function normalizeAngle(angle) {
  let mutableAngle = angle;
  while (mutableAngle < 0) mutableAngle += 2 * Math.PI;
  while (mutableAngle >= 2 * Math.PI) mutableAngle -= 2 * Math.PI;
  return mutableAngle;
}

function shortestAngleDiff(a, b) {
  let angleDiff = b - a;
  if (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  } else if (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  return angleDiff;
}

function interpolateAngle(previousAngle, nextAngle, interpolationFactor) {
  const normalizedPreviousAngle = normalizeAngle(previousAngle);
  const normalizedNextAngle = normalizeAngle(nextAngle);
  const angleDiff = shortestAngleDiff(normalizedPreviousAngle, normalizedNextAngle);
  const interpolatedAngle = normalizedPreviousAngle + angleDiff * (1 - interpolationFactor);
  return normalizeAngle(interpolatedAngle);
}

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }

  lastFrameTime = currentTime;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isPortrait) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-canvas.height / 2, -canvas.width / 2);
  }

  const width = (isPortrait ? canvas.height : canvas.width) / horixontalN;
  const height = (isPortrait ? canvas.width : canvas.height) / verticalN;
  const unit = Math.min(width, height);
  const xOffset = height < width ? (Math.abs(width - height) * horixontalN) / 2 : 0;
  const yOffset = width < height ? (Math.abs(height - width) * verticalN) / 2 : 0;

  const now = new Date();
  const interpolationFactor = isInitialAnimationDone ? baseInterpolationFactor : initialInterpolationFactor;

  for (let i = 0; i < verticalN; i++) {
    for (let j = 0; j < horixontalN; j++) {
      ctx.beginPath();
      ctx.fillStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#000";
      const x = (j + 0.5) * unit + xOffset;
      const y = (i + 0.5) * unit + yOffset;
      const radius = unit * 0.5;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const angles = getClockAngles(i, j, now);
      if (!angles) {
        continue;
      }
      const [nextHourAngle, nextMinuteAngle, nextSecondAngle, nextColorFactor] = angles;
      const [previousHourAngle, previousMinuteAngle, previousSecondAngle, previousColorFactor] = previousState.get(
        `${i},${j}`,
      );

      if (
        i === 0 &&
        j === 0 &&
        !isInitialAnimationDone &&
        Math.abs(shortestAngleDiff(nextSecondAngle, previousSecondAngle)) < initialAnimationThreshold &&
        Math.abs(shortestAngleDiff(nextMinuteAngle, previousMinuteAngle)) < initialAnimationThreshold &&
        Math.abs(shortestAngleDiff(nextHourAngle, previousHourAngle)) < initialAnimationThreshold
      ) {
        isInitialAnimationDone = true;
      }

      const hourAngle = interpolateAngle(previousHourAngle, nextHourAngle, interpolationFactor);
      const minuteAngle = interpolateAngle(previousMinuteAngle, nextMinuteAngle, interpolationFactor);
      const secondAngle = interpolateAngle(previousSecondAngle, nextSecondAngle, interpolationFactor);
      const colorFactor = interpolate(previousColorFactor, nextColorFactor, interpolationFactor);
      const baseThickness = (radius * (colorFactor + 1)) / 2;
      const baseLength = (radius * (colorFactor + 7)) / 8;

      previousState.set(`${i},${j}`, [hourAngle, minuteAngle, secondAngle, colorFactor]);

      const colorHex = Math.floor(8 * (1 - colorFactor)).toString(16);
      ctx.beginPath();
      ctx.strokeStyle = `#${colorHex}${colorHex}${colorHex}`;
      ctx.lineWidth = baseThickness * 0.08;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(hourAngle) * baseLength * 0.7, y + Math.sin(hourAngle) * baseLength * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = baseThickness * 0.065;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(minuteAngle) * baseLength * 0.9, y + Math.sin(minuteAngle) * baseLength * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = baseThickness * 0.04;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(secondAngle) * baseLength * 0.95, y + Math.sin(secondAngle) * baseLength * 0.95);
      ctx.stroke();
    }
  }

  if (isPortrait) {
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

function directionToAngle(direction) {
  switch (direction) {
    case "E":
      return 0;
    case "SE":
      return Math.PI / 4;
    case "S":
      return Math.PI / 2;
    case "SW":
      return (3 * Math.PI) / 4;
    case "W":
      return Math.PI;
    case "NW":
      return (5 * Math.PI) / 4;
    case "N":
      return (3 * Math.PI) / 2;
    case "NE":
      return (7 * Math.PI) / 4;
  }
}

function getDigitAt(digit, x, y) {
  const key = `${x - 1},${y - 3}`;
  if (digits[digit]?.[key]) {
    const directions = digits[digit][key];
    return [directionToAngle(directions[0]), directionToAngle(directions[1]), directionToAngle(directions[0]), 1];
  }
  return null;
}

function getClockAngles(y, x, now) {
  const [tensHoursDigit, onesHoursDigit] = String(now.getHours()).padStart(2, "0").split("");
  const tensHours = getDigitAt(tensHoursDigit, x, y);
  if (tensHours) return tensHours;
  const onesHours = getDigitAt(onesHoursDigit, x - 4, y);
  if (onesHours) return onesHours;
  const [tensMinutesDigit, onesMinutesDigit] = String(now.getMinutes()).padStart(2, "0").split("");
  const tensMinutes = getDigitAt(tensMinutesDigit, x - 9, y);
  if (tensMinutes) return tensMinutes;
  const onesMinutes = getDigitAt(onesMinutesDigit, x - 13, y);
  if (onesMinutes) return onesMinutes;
  const [tensSecondsDigit, onesSecondsDigit] = String(now.getSeconds()).padStart(2, "0").split("");
  const tensSeconds = getDigitAt(tensSecondsDigit, x - 18, y);
  if (tensSeconds) return tensSeconds;
  const onesSeconds = getDigitAt(onesSecondsDigit, x - 22, y);
  if (onesSeconds) return onesSeconds;

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secondAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;

  return [hourAngle, minuteAngle, secondAngle, 0];
}
