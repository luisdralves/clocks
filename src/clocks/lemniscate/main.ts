import { createAnimationLoop } from '@/lib/animation';
import { createResizeHandler, setupCanvas } from '@/lib/canvas';
import { createSpring, updateSpring } from '@/lib/spring';
import type { CanvasContext, SpringState } from '@/lib/types';
import {
  arcLengthToT,
  buildArcLengthTable,
  LEMNISCATE_HEIGHT,
  LEMNISCATE_WIDTH,
  lemniscateNormal,
  lemniscatePoint,
} from './curve';

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Canvas not found');

let ctx: CanvasContext = setupCanvas(canvas);
createResizeHandler(canvas, (newCtx) => {
  ctx = newCtx;
});

const arcLengthTable = buildArcLengthTable();

const initialSecond = new Date().getSeconds();
let secondSpring: SpringState = createSpring(initialSecond);

function drawLemniscateHand(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  t: number,
  handLength: number,
  lineWidth: number,
  color: string,
  showExtension: boolean = true,
): void {
  const point = lemniscatePoint(t, scale * handLength);
  const edge = lemniscatePoint(t, scale);

  if (showExtension) {
    // Extension line
    context.beginPath();
    context.strokeStyle = color === 'red' ? 'red' : '#444';
    context.lineWidth = 1;
    context.lineCap = 'butt';
    context.moveTo(centerX + point.x, centerY + point.y);
    context.lineTo(centerX + edge.x, centerY + edge.y);
    context.stroke();
  }

  if (color !== 'red') {
    // White outline for non-second hands
    context.beginPath();
    context.strokeStyle = 'white';
    context.lineWidth = lineWidth + 4;
    context.lineCap = 'round';
    context.moveTo(centerX, centerY);
    context.lineTo(centerX + point.x, centerY + point.y);
    context.stroke();
  }

  // Main hand
  context.beginPath();
  context.strokeStyle = color === 'red' ? 'red' : '#444';
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.moveTo(centerX, centerY);
  context.lineTo(centerX + point.x, centerY + point.y);
  context.stroke();
}

const animation = createAnimationLoop({
  fps: 30,
  onFrame: () => {
    const { ctx: context, width, height } = ctx;
    const centerX = width / 2;
    const centerY = height / 2;

    const padding = 0.9;
    const scale = Math.min(
      (width * padding) / LEMNISCATE_WIDTH,
      (height * padding) / LEMNISCATE_HEIGHT,
    );

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    context.beginPath();
    context.fillStyle = 'white';
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const point = lemniscatePoint(t, scale);
      if (i === 0) {
        context.moveTo(centerX + point.x, centerY + point.y);
      } else {
        context.lineTo(centerX + point.x, centerY + point.y);
      }
    }
    context.closePath();
    context.fill();

    context.strokeStyle = 'black';
    context.lineWidth = scale * 0.005;
    for (let i = 0; i < 60; i++) {
      if (i === 0 || i === 30) continue;
      const t = arcLengthToT((i / 60 + 0.25) % 1, arcLengthTable);
      const outerPoint = lemniscatePoint(t, scale);
      const normal = lemniscateNormal(t);
      const tickLength = scale * 0.025;

      context.beginPath();
      context.moveTo(centerX + outerPoint.x, centerY + outerPoint.y);
      context.lineTo(
        centerX + outerPoint.x - normal.x * tickLength,
        centerY + outerPoint.y - normal.y * tickLength,
      );
      context.stroke();

      if (i % 5 !== 0) {
        const textOffset = scale * 0.06;
        context.font = `${scale * 0.025}px sans-serif`;
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(
          i.toString(),
          centerX + outerPoint.x - normal.x * textOffset,
          centerY + outerPoint.y - normal.y * textOffset,
        );
      }
    }

    context.lineWidth = scale * 0.01;
    for (let i = 0; i < 24; i++) {
      if (i === 0 || i === 12) continue;
      const t = arcLengthToT((i / 24 + 0.25) % 1, arcLengthTable);
      const outerPoint = lemniscatePoint(t, scale);
      const normal = lemniscateNormal(t);
      const tickLength = scale * 0.05;

      context.beginPath();
      context.moveTo(centerX + outerPoint.x, centerY + outerPoint.y);
      context.lineTo(
        centerX + outerPoint.x - normal.x * tickLength,
        centerY + outerPoint.y - normal.y * tickLength,
      );
      context.stroke();

      const textOffset = scale * 0.1;
      context.font = `${scale * 0.05}px sans-serif`;
      context.fillStyle = 'black';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        i.toString(),
        centerX + outerPoint.x - normal.x * textOffset,
        centerY + outerPoint.y - normal.y * textOffset,
      );
    }

    const now = new Date();
    const currentSecond = now.getSeconds();
    const minutes = now.getMinutes() + currentSecond / 60;
    const hours = now.getHours() + minutes / 60;

    secondSpring = updateSpring(secondSpring, currentSecond, 60);

    const hourT = arcLengthToT((hours / 24 + 0.25) % 1, arcLengthTable);
    const minuteT = arcLengthToT((minutes / 60 + 0.25) % 1, arcLengthTable);
    const secondT = arcLengthToT((((secondSpring.position / 60) % 1) + 1.25) % 1, arcLengthTable);

    drawLemniscateHand(context, centerX, centerY, scale, hourT, 0.5, scale * 0.03, '#444');
    drawLemniscateHand(context, centerX, centerY, scale, minuteT, 0.7, scale * 0.02, '#444');
    drawLemniscateHand(context, centerX, centerY, scale, secondT, 0.85, scale * 0.01, 'red');

    context.beginPath();
    context.fillStyle = 'black';
    context.arc(centerX, centerY, scale * 0.02, 0, Math.PI * 2);
    context.fill();
  },
});

animation.start();
