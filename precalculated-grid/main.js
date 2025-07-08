const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const n = 486;
const borderWidth = 8;
const frameInterval = 1000 / 60;
let lastFrameTime = 0;
const initialInterpolationFactor = 0.95;
const baseInterpolationFactor = 0.75;
let isInitialAnimationDone = false;
const maxZoom = 0.5;
const minZoom = 0.05;
const maxDistance = 1;

const previousState = {
  x: n / 2,
  y: n / 2,
  zoom: minZoom,
};

function getZoom(distance) {
  return Math.min(maxZoom, Math.max(minZoom, ((minZoom - maxZoom) * distance) / maxDistance + maxZoom));
}

function interpolate(previousValue, nextValue, interpolationFactor) {
  return interpolationFactor * previousValue + (1 - interpolationFactor) * nextValue;
}

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }

  lastFrameTime = currentTime;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const now = new Date();
  const targetIndex = timeToIndex(now);
  const [targetX, targetY] = indexToCoordinates(targetIndex);
  now.setSeconds(now.getSeconds() - 1);
  const previousIndex = timeToIndex(now);
  const [previousX, previousY] = indexToCoordinates(previousIndex);

  const interpolationFactor = isInitialAnimationDone ? baseInterpolationFactor : initialInterpolationFactor;
  const x = interpolate(previousState.x, targetX, interpolationFactor);
  const y = interpolate(previousState.y, targetY, interpolationFactor);
  const distanceToTarget = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
  const distanceToPrevious = Math.sqrt((x - previousX) ** 2 + (y - previousY) ** 2);
  const zoom = interpolate(
    previousState.zoom,
    getZoom(Math.min(distanceToTarget, distanceToPrevious)),
    Math.sqrt(interpolationFactor),
  );

  if (!isInitialAnimationDone && zoom >= maxZoom / 2) {
    isInitialAnimationDone = true;
  }

  previousState.x = x;
  previousState.y = y;
  previousState.zoom = zoom;

  ctx.save();
  const translateX = ((1 - zoom) * canvas.width) / 2;
  const translateY = ((1 - zoom) * canvas.height) / 2;
  ctx.translate(translateX, translateY);
  ctx.scale(zoom, zoom);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "red";
  const xOffset = 1 - (x - Math.floor(x));
  const yOffset = 1 - (y - Math.floor(y));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  const fontSize = Math.min(canvas.width / 8, canvas.height / 2);
  ctx.font = `${fontSize}px monospace`;

  const visibleLeft = -translateX / zoom - (canvas.width);
  const visibleTop = -translateY / zoom - (canvas.height);
  const visibleRight = (canvas.width - translateX) / zoom + (canvas.width);
  const visibleBottom = (canvas.height - translateY) / zoom + (canvas.height);

  let squaresDrawn = 0;
  let ringIndex = 0;
  let drawMoreRings = true;
  while (drawMoreRings) {
    const points = getRingPoints(ringIndex++);

    for (const [i, j] of points) {
      squaresDrawn++;
      if (
        drawMoreRings &&
        (i * canvas.width < visibleLeft ||
          i * canvas.width > visibleRight ||
          j * canvas.height < visibleTop ||
          j * canvas.height > visibleBottom)
      ) {
        drawMoreRings = false;
      }

      drawSquareAt(ctx, x, y, i, j, xOffset, yOffset);
    }
  }

  ctx.restore();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = `${fontSize * maxZoom}px monospace`;
  ctx.fillText(":  :", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(squaresDrawn, 0, 0);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

function timeToIndex(time) {
  return Number(
    `${String(time.getHours()).padStart(2, "0")}${String(time.getMinutes()).padStart(2, "0")}${String(time.getSeconds()).padStart(2, "0")}`,
  );
}

function coordinatesToIndex(x, y) {
  return x + y * n;
}

function indexToCoordinates(index) {
  return [index % n, Math.floor(index / n)];
}

const ringPoints = new Map([[0, [[0, 0]]]]);

function getRingPoints(ringIndex) {
  const points = ringPoints.get(ringIndex) ?? [];
  if (points.length) {
    return points;
  }

  let x = ringIndex;
  let y = -ringIndex + 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
  ];

  x = ringIndex;
  y = -ringIndex;

  for (let side = 0; side < 4; side++) {
    const { dx, dy } = directions[side];
    for (let step = 0; step < 2 * ringIndex; step++) {
      points.push([x, y]);
      x += dx;
      y += dy;
    }
  }

  ringPoints.set(ringIndex, points);

  return points;
}

function drawSquareAt(ctx, x, y, i, j, xOffset, yOffset) {
  const digits = String(coordinatesToIndex(Math.floor(x) + 1 + i, Math.floor(y) + j)).padStart(6, "0");
  const hours = digits.slice(0, 2);
  const minutes = digits.slice(2, 4);
  const seconds = digits.slice(4, 6);
  const isValid = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;

  ctx.fillStyle = isValid ? "green" : "red";
  ctx.fillRect(
    (i + xOffset) * canvas.width - borderWidth / 2,
    (j + yOffset - 1) * canvas.height - borderWidth / 2,
    canvas.width - borderWidth,
    canvas.height - borderWidth,
  );

  ctx.fillStyle = "white";
  ctx.fillText(
    `${hours} ${minutes} ${seconds}`,
    (i + xOffset) * canvas.width + canvas.width / 2,
    (j + yOffset - 1) * canvas.height + canvas.height / 2,
  );
}
