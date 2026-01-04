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

// Lemniscate parametric equations
// Returns point on lemniscate for parameter t (0 to 2π)
const verticalStretch = 1.25;
function lemniscatePoint(t, scale) {
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);
  const denom = 1 + sinT * sinT;
  const x = (-scale * cosT) / denom; // Negated to put morning on the right
  const y = (scale * sinT * cosT * verticalStretch) / denom;
  return { x, y };
}

// Returns the inward normal (perpendicular) vector at parameter t
function lemniscateNormal(t) {
  const delta = 0.001;
  const p1 = lemniscatePoint(t - delta, 1);
  const p2 = lemniscatePoint(t + delta, 1);
  const point = lemniscatePoint(t, 1);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Normal is perpendicular to tangent: rotate 90 degrees
  let nx = -dy / len;
  let ny = dx / len;
  // Ensure normal points inward (toward center)
  if (nx * point.x + ny * point.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

// Build arc-length lookup table for uniform distribution
const arcLengthSamples = 1000;
const arcLengthTable = [];
let totalArcLength = 0;
for (let i = 0; i <= arcLengthSamples; i++) {
  const t = (i / arcLengthSamples) * Math.PI * 2;
  if (i > 0) {
    const prevT = ((i - 1) / arcLengthSamples) * Math.PI * 2;
    const p1 = lemniscatePoint(prevT, 1);
    const p2 = lemniscatePoint(t, 1);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    totalArcLength += Math.sqrt(dx * dx + dy * dy);
  }
  arcLengthTable.push({ t, arcLength: totalArcLength });
}

// Returns parameter t for a given normalized arc length (0 to 1)
function arcLengthToT(normalizedArc) {
  const targetLength = normalizedArc * totalArcLength;
  // Binary search for the right segment
  let low = 0;
  let high = arcLengthTable.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (arcLengthTable[mid].arcLength < targetLength) {
      low = mid;
    } else {
      high = mid;
    }
  }
  // Interpolate between low and high
  const a = arcLengthTable[low];
  const b = arcLengthTable[high];
  const segmentLength = b.arcLength - a.arcLength;
  const segmentFraction = segmentLength > 0 ? (targetLength - a.arcLength) / segmentLength : 0;
  return a.t + segmentFraction * (b.t - a.t);
}

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }
  lastFrameTime = currentTime;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  // Lemniscate spans 2 units wide and ~1.25 units tall (with verticalStretch)
  const lemniscateWidth = 2;
  const lemniscateHeight = verticalStretch;
  const padding = 0.9; // Leave some margin
  const scale = Math.min(
    (canvas.width * padding) / lemniscateWidth,
    (canvas.height * padding) / lemniscateHeight
  );

  // Draw lemniscate filled
  ctx.beginPath();
  ctx.fillStyle = "white";
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    const point = lemniscatePoint(t, scale);
    if (i === 0) {
      ctx.moveTo(centerX + point.x, centerY + point.y);
    } else {
      ctx.lineTo(centerX + point.x, centerY + point.y);
    }
  }
  ctx.closePath();
  ctx.fill();

  // Minute tick markers (60 ticks)
  ctx.strokeStyle = "black";
  ctx.lineWidth = scale * 0.005;
  for (let i = 0; i < 60; i++) {
    // Skip center crossing (minute 0 and 30)
    if (i === 0 || i === 30) continue;
    const t = arcLengthToT((i / 60 + 0.25) % 1);
    const outerPoint = lemniscatePoint(t, scale);
    const normal = lemniscateNormal(t);
    const tickLength = scale * 0.025;
    ctx.beginPath();
    ctx.moveTo(centerX + outerPoint.x, centerY + outerPoint.y);
    ctx.lineTo(
      centerX + outerPoint.x - normal.x * tickLength,
      centerY + outerPoint.y - normal.y * tickLength
    );
    ctx.stroke();

    // Minute number (skip if there's an hour number at this position)
    if (i % 5 !== 0) {
      const textOffset = scale * 0.06;
      ctx.font = `${scale * 0.025}px sans-serif`;
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        i.toString(),
        centerX + outerPoint.x - normal.x * textOffset,
        centerY + outerPoint.y - normal.y * textOffset
      );
    }
  }

  // Hour tick markers (24 ticks)
  ctx.lineWidth = scale * 0.01;
  for (let i = 0; i < 24; i++) {
    // Skip center crossing (hour 0 and 12)
    if (i === 0 || i === 12) continue;
    const t = arcLengthToT((i / 24 + 0.25) % 1);
    const outerPoint = lemniscatePoint(t, scale);
    const normal = lemniscateNormal(t);
    const tickLength = scale * 0.05;
    ctx.beginPath();
    ctx.moveTo(centerX + outerPoint.x, centerY + outerPoint.y);
    ctx.lineTo(
      centerX + outerPoint.x - normal.x * tickLength,
      centerY + outerPoint.y - normal.y * tickLength
    );
    ctx.stroke();

    // Hour number
    const textOffset = scale * 0.1;
    ctx.font = `${scale * 0.05}px sans-serif`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      i.toString(),
      centerX + outerPoint.x - normal.x * textOffset,
      centerY + outerPoint.y - normal.y * textOffset
    );
  }

  const now = new Date();
  const currentSecond = now.getSeconds();
  const minutes = now.getMinutes() + currentSecond / 60;
  const hours = now.getHours() + minutes / 60;

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

  // Map time to parameter t using arc-length parameterization
  const hourT = arcLengthToT((hours / 24 + 0.25) % 1);
  const minuteT = arcLengthToT((minutes / 60 + 0.25) % 1);
  const secondT = arcLengthToT(((secondSpring.position / 60) % 1 + 1.25) % 1);

  // Hour hand
  const hourPoint = lemniscatePoint(hourT, scale * 0.5);
  const hourEdge = lemniscatePoint(hourT, scale);
  // Extension line
  ctx.beginPath();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.moveTo(centerX + hourPoint.x, centerY + hourPoint.y);
  ctx.lineTo(centerX + hourEdge.x, centerY + hourEdge.y);
  ctx.stroke();
  // White outline
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = scale * 0.03 + 4;
  ctx.lineCap = "round";
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + hourPoint.x, centerY + hourPoint.y);
  ctx.stroke();
  // Dark gray hand
  ctx.beginPath();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = scale * 0.03;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + hourPoint.x, centerY + hourPoint.y);
  ctx.stroke();

  // Minute hand
  const minutePoint = lemniscatePoint(minuteT, scale * 0.7);
  const minuteEdge = lemniscatePoint(minuteT, scale);
  // Extension line
  ctx.beginPath();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.moveTo(centerX + minutePoint.x, centerY + minutePoint.y);
  ctx.lineTo(centerX + minuteEdge.x, centerY + minuteEdge.y);
  ctx.stroke();
  // White outline
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = scale * 0.02 + 4;
  ctx.lineCap = "round";
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + minutePoint.x, centerY + minutePoint.y);
  ctx.stroke();
  // Dark gray hand
  ctx.beginPath();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = scale * 0.02;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + minutePoint.x, centerY + minutePoint.y);
  ctx.stroke();

  // Second hand
  const secondPoint = lemniscatePoint(secondT, scale * 0.85);
  const secondEdge = lemniscatePoint(secondT, scale);
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.moveTo(centerX + secondPoint.x, centerY + secondPoint.y);
  ctx.lineTo(centerX + secondEdge.x, centerY + secondEdge.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = scale * 0.01;
  ctx.lineCap = "round";
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + secondPoint.x, centerY + secondPoint.y);
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.fillStyle = "black";
  ctx.arc(centerX, centerY, scale * 0.02, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
