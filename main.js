import { digits } from "./digits.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const horixontalN = 15;
const verticalN = 8;
const frameInterval = 1000 / 30;
let lastFrameTime = 0;

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }

  lastFrameTime = currentTime;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width / horixontalN;
  const height = canvas.height / verticalN;

  for (let i = 0; i < verticalN; i++) {
    for (let j = 0; j < horixontalN; j++) {
      ctx.beginPath();
      ctx.fillStyle = "white";
      const x = (j + 0.5) * width;
      const y = (i + 0.5) * height;
      const radius = Math.min(width, height) * 0.45;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      const angles = getClockAngles(i, j);
      if (!angles) {
        continue;
      }
      const [hourAngle, minuteAngle, secondAngle] = angles;

      ctx.beginPath();
      ctx.strokeStyle = "black";
      ctx.lineWidth = radius * 0.06;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(hourAngle) * radius * 0.7, y + Math.sin(hourAngle) * radius * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = radius * 0.05;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(minuteAngle) * radius * 0.9, y + Math.sin(minuteAngle) * radius * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = radius * 0.04;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(secondAngle) * radius * 0.95, y + Math.sin(secondAngle) * radius * 0.95);
      ctx.stroke();
    }
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

function getClockAngles(y, x) {
  const key = `${x - 1},${y - 1}`;
  if (digits[1][key]) {
    const directions = digits[1][key];
    return [directionToAngle(directions[0]), directionToAngle(directions[1]), directionToAngle(directions[0])];
  }

  const now = new Date();
  const time = now.getTime();
  const msInHour = 3600000;
  const msInMinute = 60000;

  const secondAngle = ((time % msInMinute) / msInMinute) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = ((time % msInHour) / msInHour) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((time % (msInHour * 12)) / (msInHour * 12)) * Math.PI * 2 - Math.PI / 2;

  return [hourAngle, minuteAngle, secondAngle];
}
