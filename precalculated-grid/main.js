const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const n = 500;
const frameInterval = 1000 / 60;
let lastFrameTime = 0;

const previousState = {
  x: n / 2,
  y: n / 2,
};

const targetState = {
  x: n / 2,
  y: n / 2,
};

const interpolationFactor = 0.85;

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
  const index = Number(
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`,
  );
  targetState.x = (index % n) - 1;
  targetState.y = Math.floor(index / n) - 1;

  const x = interpolate(previousState.x, targetState.x, interpolationFactor);
  const y = interpolate(previousState.y, targetState.y, interpolationFactor);
  const zoom = 1;

  previousState.x = x;
  previousState.y = y;

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "red";
  const xOffset = 1 - (x - Math.floor(x));
  const yOffset = 1 - (y - Math.floor(y));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  const fontSize = Math.min(canvas.width / 8, canvas.height / 2);
  ctx.font = `${fontSize}px Arial`;

  for (const i of [-1, 0, 1, 2]) {
    for (const j of [-1, 0, 1, 2]) {
      ctx.fillStyle = "green";
      ctx.strokeStyle = "red";
      ctx.fillRect((i + xOffset) * canvas.width, (j + yOffset) * canvas.height, canvas.width, canvas.height);
      ctx.strokeRect((i + xOffset) * canvas.width, (j + yOffset) * canvas.height, canvas.width, canvas.height);

      const digits = String(Math.round(x + i + 1) + Math.round(y + j + 1) * n).padStart(6, "0");
      ctx.fillStyle = "white";
      ctx.fillText(
        `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`,
        (i + xOffset) * canvas.width + canvas.width / 2,
        (j + yOffset) * canvas.height + canvas.height / 2,
      );
    }
  }

  ctx.restore();
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
