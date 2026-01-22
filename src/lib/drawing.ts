import type { HandStyle } from './types';

export function drawHand(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  angle: number,
  style: HandStyle,
  radius: number,
): void {
  ctx.beginPath();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = radius * style.width;
  ctx.lineCap = style.lineCap ?? 'round';
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(angle) * radius * style.length,
    centerY + Math.sin(angle) * radius * style.length,
  );
  ctx.stroke();
}

export interface TickMarkOptions {
  innerRadiusFraction: number;
  lineWidth: number;
  color: string;
  majorInterval?: number;
  majorInnerRadiusFraction?: number;
  majorLineWidth?: number;
}

export function drawTickMarks(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
  options: TickMarkOptions,
): void {
  ctx.strokeStyle = options.color;

  for (let i = 0; i < count; i++) {
    const isMajor = options.majorInterval !== undefined && i % options.majorInterval === 0;
    const innerFraction =
      isMajor && options.majorInnerRadiusFraction !== undefined
        ? options.majorInnerRadiusFraction
        : options.innerRadiusFraction;
    const width =
      isMajor && options.majorLineWidth !== undefined ? options.majorLineWidth : options.lineWidth;

    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * radius * innerFraction,
      centerY + Math.sin(angle) * radius * innerFraction,
    );
    ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    ctx.stroke();
  }
}

export function drawCenterDot(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  fillColor: string,
): void {
  ctx.beginPath();
  ctx.fillStyle = fillColor;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}
