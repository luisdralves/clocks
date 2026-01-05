const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const frameInterval = 1000 / 30;
let lastFrameTime = 0;

const initialSecond = new Date().getSeconds();
let lastSecond = initialSecond;
let secondSpring = { position: initialSecond, velocity: 0 };
const springStiffness = 2;
const springDamping = 0.4;
const springAcceleration = 0.25;

// Spiral parameters
const outerLevels = 3;
const innerLevels = 5;
const baseRadius = 0.5;
const ratio = 0.5;

// Returns radius for a position (0-1) on a given level
function spiralRadius(position, level) {
  return baseRadius * Math.pow(ratio, level + position);
}

// Returns point on spiral
function spiralPoint(position, level, scale) {
  const angle = position * Math.PI * 2 - Math.PI / 2;
  const radius = spiralRadius(position, level) * scale;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    angle,
  };
}

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }
  lastFrameTime = currentTime;

  const now = new Date();
  const currentSecond = now.getSeconds();
  const minutes = now.getMinutes() + currentSecond / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  // Spring physics for second hand
  if (currentSecond !== lastSecond) {
    if (lastSecond === 59 && currentSecond === 0) {
      secondSpring.position -= 60;
    }
    secondSpring.velocity += springAcceleration;
    lastSecond = currentSecond;
  }
  const targetPosition = currentSecond;
  const displacement = targetPosition - secondSpring.position;
  const springForce = displacement * springStiffness;
  secondSpring.velocity += springForce;
  secondSpring.velocity *= springDamping;
  secondSpring.position += secondSpring.velocity;

  // Current position on the spiral (0-1 represents one 12-hour cycle)
  const hourPos = hours / 12;
  const minutePos = minutes / 60;
  const secondPos = ((secondSpring.position / 60) % 1 + 1) % 1;

  // Smooth second position for zoom (continuous, not spring-based)
  const smoothSeconds = currentSecond + now.getMilliseconds() / 1000;
  const smoothSecondPos = smoothSeconds / 60;

  // Zoom that compensates for spiral growth based on smooth second position
  // Only compensates for ratio growth, not baseRadius (so baseRadius affects visual size)
  const zoomFactor = 1 / Math.pow(ratio, smoothSecondPos);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  // Scale so that radius 1.0 = 45% of screen, then apply zoom
  // This makes the percentages meaningful (100% = fills to edge)
  const baseScale = Math.min(canvas.width, canvas.height) * 0.45;
  const scale = baseScale * zoomFactor;

  // Draw spiral with blueshift/redshift effect
  // White at current second, blue towards center, red towards outside
  // Line thickness proportional to radius (thinner towards center)

  for (let level = -outerLevels; level <= innerLevels; level++) {
    for (let i = 0; i < 360; i++) {
      const position = i / 360;
      const nextPosition = (i + 1) / 360;

      const point = spiralPoint(position, level, scale);
      const nextPoint = spiralPoint(nextPosition, level, scale);

      // Distance from current second position (level 0, smoothSecondPos)
      const midPosition = (position + nextPosition) / 2;
      const distance = (level + midPosition) - smoothSecondPos;

      // Line width proportional to spiral radius, scaled with zoom
      const radius = spiralRadius(midPosition, level);
      ctx.lineWidth = 2 * (radius / baseRadius) * zoomFactor;

      // Interpolate color: negative distance = red (outer/past), positive = blue (inner/future)
      let r, g, b;
      if (distance < 0) {
        // Red shift (outer) - white to red
        const t = Math.min(1, Math.abs(distance) / 2);
        r = 255;
        g = Math.round(255 * (1 - t));
        b = Math.round(255 * (1 - t));
      } else {
        // Blue shift (inner) - white to blue
        const t = Math.min(1, Math.abs(distance) / 2);
        r = Math.round(255 * (1 - t));
        g = Math.round(255 * (1 - t));
        b = 255;
      }

      ctx.beginPath();
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.moveTo(centerX + point.x, centerY + point.y);
      ctx.lineTo(centerX + nextPoint.x, centerY + nextPoint.y);
      ctx.stroke();
    }
  }

  // Draw tick marks on each level with blueshift/redshift colors
  for (let level = -outerLevels; level <= innerLevels; level++) {
    for (let i = 0; i < 60; i++) {
      const position = i / 60;
      const isHour = i % 5 === 0;
      const point = spiralPoint(position, level, scale);

      // Tick size and thickness proportional to spiral radius at this point, scaled with zoom
      const radius = spiralRadius(position, level);
      const tickLength = radius * (isHour ? 0.08 : 0.03) * scale;
      ctx.lineWidth = (isHour ? 2 : 1) * (radius / baseRadius) * zoomFactor;

      // Distance from current second position
      const distance = (level + position) - smoothSecondPos;

      // Interpolate color: negative distance = red (outer/past), positive = blue (inner/future)
      let r, g, b;
      if (distance < 0) {
        const t = Math.min(1, Math.abs(distance) / 2);
        r = 255;
        g = Math.round(255 * (1 - t));
        b = Math.round(255 * (1 - t));
      } else {
        const t = Math.min(1, Math.abs(distance) / 2);
        r = Math.round(255 * (1 - t));
        g = Math.round(255 * (1 - t));
        b = 255;
      }
      ctx.strokeStyle = `rgb(${r},${g},${b})`;

      const innerX = point.x - Math.cos(point.angle) * tickLength;
      const innerY = point.y - Math.sin(point.angle) * tickLength;

      ctx.beginPath();
      ctx.moveTo(centerX + point.x, centerY + point.y);
      ctx.lineTo(centerX + innerX, centerY + innerY);
      ctx.stroke();
    }
  }

  // Hand lengths relative to spiral's base radius
  const handScale = baseScale * baseRadius;

  // Hour hand - constant visual length, direction based on hour position
  const hourAngle = hourPos * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(hourAngle) * handScale * 0.55, centerY + Math.sin(hourAngle) * handScale * 0.55);
  ctx.stroke();

  // Minute hand - constant visual length, direction based on minute position
  const minuteAngle = minutePos * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(minuteAngle) * handScale * 0.75, centerY + Math.sin(minuteAngle) * handScale * 0.75);
  ctx.stroke();

  // Second hand - constant visual length, direction based on spring position
  const secondAngle = secondPos * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(secondAngle) * handScale * 0.95, centerY + Math.sin(secondAngle) * handScale * 0.95);
  ctx.stroke();

  // Center dot (large enough to mask innermost spiral pop-in)
  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
