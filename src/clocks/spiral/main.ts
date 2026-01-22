import { createAnimationLoop } from '@/lib/animation';
import { createResizeHandler, setupCanvas } from '@/lib/canvas';
import { createSpring, updateSpring } from '@/lib/spring';
import type { CanvasContext, SpringState } from '@/lib/types';
import {
  colorToRgb,
  DEFAULT_SPIRAL_CONFIG,
  getDopplerColor,
  spiralPoint,
  spiralRadius,
} from './spiral';

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Canvas not found');

let ctx: CanvasContext = setupCanvas(canvas);
createResizeHandler(canvas, (newCtx) => {
  ctx = newCtx;
});

const config = DEFAULT_SPIRAL_CONFIG;
const initialSecond = new Date().getSeconds();
let secondSpring: SpringState = createSpring(initialSecond);

const animation = createAnimationLoop({
  fps: 30,
  onFrame: () => {
    const { ctx: context, width, height } = ctx;
    const centerX = width / 2;
    const centerY = height / 2;

    const now = new Date();
    const currentSecond = now.getSeconds();
    const minutes = now.getMinutes() + currentSecond / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    secondSpring = updateSpring(secondSpring, currentSecond, 60);

    const hourPos = hours / 12;
    const minutePos = minutes / 60;
    const secondPos = (((secondSpring.position / 60) % 1) + 1) % 1;

    const smoothSeconds = currentSecond + now.getMilliseconds() / 1000;
    const smoothSecondPos = smoothSeconds / 60;

    const zoomFactor = 1 / config.ratio ** smoothSecondPos;

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    const baseScale = Math.min(width, height) * 0.45;
    const scale = baseScale * zoomFactor;

    for (let level = -config.outerLevels; level <= config.innerLevels; level++) {
      for (let i = 0; i < 360; i++) {
        const position = i / 360;
        const nextPosition = (i + 1) / 360;

        const point = spiralPoint(position, level, scale, config);
        const nextPoint = spiralPoint(nextPosition, level, scale, config);

        const midPosition = (position + nextPosition) / 2;
        const distance = level + midPosition - smoothSecondPos;

        const radius = spiralRadius(midPosition, level, config);
        context.lineWidth = 2 * (radius / config.baseRadius) * zoomFactor;

        const color = getDopplerColor(distance);
        context.beginPath();
        context.strokeStyle = colorToRgb(color);
        context.moveTo(centerX + point.x, centerY + point.y);
        context.lineTo(centerX + nextPoint.x, centerY + nextPoint.y);
        context.stroke();
      }
    }

    for (let level = -config.outerLevels; level <= config.innerLevels; level++) {
      for (let i = 0; i < 60; i++) {
        const position = i / 60;
        const isHour = i % 5 === 0;
        const point = spiralPoint(position, level, scale, config);

        const radius = spiralRadius(position, level, config);
        const tickLength = radius * (isHour ? 0.08 : 0.03) * scale;
        context.lineWidth = (isHour ? 2 : 1) * (radius / config.baseRadius) * zoomFactor;

        const distance = level + position - smoothSecondPos;
        const color = getDopplerColor(distance);
        context.strokeStyle = colorToRgb(color);

        const innerX = point.x - Math.cos(point.angle) * tickLength;
        const innerY = point.y - Math.sin(point.angle) * tickLength;

        context.beginPath();
        context.moveTo(centerX + point.x, centerY + point.y);
        context.lineTo(centerX + innerX, centerY + innerY);
        context.stroke();
      }
    }

    const handScale = baseScale * config.baseRadius;

    const hourAngle = hourPos * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.strokeStyle = 'white';
    context.lineWidth = 8;
    context.lineCap = 'round';
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + Math.cos(hourAngle) * handScale * 0.55,
      centerY + Math.sin(hourAngle) * handScale * 0.55,
    );
    context.stroke();

    const minuteAngle = minutePos * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.lineWidth = 5;
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + Math.cos(minuteAngle) * handScale * 0.75,
      centerY + Math.sin(minuteAngle) * handScale * 0.75,
    );
    context.stroke();

    const secondAngle = secondPos * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + Math.cos(secondAngle) * handScale * 0.95,
      centerY + Math.sin(secondAngle) * handScale * 0.95,
    );
    context.stroke();

    context.beginPath();
    context.fillStyle = 'white';
    context.arc(centerX, centerY, 6, 0, Math.PI * 2);
    context.fill();
  },
});

animation.start();
