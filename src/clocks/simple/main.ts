import { createAnimationLoop } from '@/lib/animation';
import { createResizeHandler, setupCanvas } from '@/lib/canvas';
import { drawCenterDot, drawCircle, drawHand, drawTickMarks } from '@/lib/drawing';
import { createSpring, updateSpring } from '@/lib/spring';
import { getTimeComponents, hoursToAngle, minutesToAngle, secondsToAngle } from '@/lib/time';
import type { CanvasContext, SpringState } from '@/lib/types';

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Canvas not found');

let ctx: CanvasContext = setupCanvas(canvas);

createResizeHandler(canvas, (newCtx) => {
  ctx = newCtx;
});

const initialSecond = new Date().getSeconds();
let secondSpring: SpringState = createSpring(initialSecond);

const animation = createAnimationLoop({
  fps: 30,
  onFrame: () => {
    const { ctx: context, width, height, centerX, centerY, radius } = ctx;

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    drawCircle(context, centerX, centerY, radius, 'white');

    drawTickMarks(context, centerX, centerY, radius, 60, {
      innerRadiusFraction: 0.95,
      lineWidth: radius * 0.005,
      color: 'black',
      majorInterval: 5,
      majorInnerRadiusFraction: 0.9,
      majorLineWidth: radius * 0.015,
    });

    const { hours12, minutes, seconds } = getTimeComponents();
    const currentSecond = Math.floor(seconds);

    secondSpring = updateSpring(secondSpring, currentSecond, 60);

    drawHand(
      context,
      centerX,
      centerY,
      hoursToAngle(hours12),
      {
        length: 0.5,
        width: 0.06,
        color: 'black',
      },
      radius,
    );

    drawHand(
      context,
      centerX,
      centerY,
      minutesToAngle(minutes),
      {
        length: 0.7,
        width: 0.04,
        color: 'black',
      },
      radius,
    );

    drawHand(
      context,
      centerX,
      centerY,
      secondsToAngle(secondSpring.position),
      {
        length: 0.8,
        width: 0.02,
        color: 'red',
      },
      radius,
    );

    drawCenterDot(context, centerX, centerY, radius * 0.04, 'black');
  },
});

animation.start();
