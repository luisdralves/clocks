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
  const radius = Math.min(canvas.width, canvas.height) * 0.4;

  // Clock face
  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Tick markers
  ctx.strokeStyle = "black";
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

  const secondAngle = (secondSpring.position / 60) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;

  // Hour hand
  ctx.beginPath();
  ctx.strokeStyle = "black";
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
  ctx.strokeStyle = "red";
  ctx.lineWidth = radius * 0.02;
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(secondAngle) * radius * 0.8,
    centerY + Math.sin(secondAngle) * radius * 0.8
  );
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.fillStyle = "black";
  ctx.arc(centerX, centerY, radius * 0.04, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
