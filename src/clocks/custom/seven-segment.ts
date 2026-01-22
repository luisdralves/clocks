const SEVEN_SEG_PATTERNS: Record<number, number[]> = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
};

export function drawSevenSegDigit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  digit: number,
  size: number,
  color: string,
): number {
  const pattern = SEVEN_SEG_PATTERNS[digit] || SEVEN_SEG_PATTERNS[0];
  const w = size * 0.6;
  const h = size;
  const t = size * 0.12;
  const gap = t * 0.3;

  ctx.fillStyle = color;

  // Segment a (top horizontal)
  if (pattern[0]) {
    ctx.beginPath();
    ctx.moveTo(x + gap + t, y);
    ctx.lineTo(x + w - gap - t, y);
    ctx.lineTo(x + w - gap, y + t / 2);
    ctx.lineTo(x + w - gap - t, y + t);
    ctx.lineTo(x + gap + t, y + t);
    ctx.lineTo(x + gap, y + t / 2);
    ctx.fill();
  }

  // Segment b (top right vertical)
  if (pattern[1]) {
    ctx.beginPath();
    ctx.moveTo(x + w, y + gap + t);
    ctx.lineTo(x + w, y + h / 2 - gap);
    ctx.lineTo(x + w - t / 2, y + h / 2);
    ctx.lineTo(x + w - t, y + h / 2 - gap);
    ctx.lineTo(x + w - t, y + gap + t);
    ctx.lineTo(x + w - t / 2, y + gap);
    ctx.fill();
  }

  // Segment c (bottom right vertical)
  if (pattern[2]) {
    ctx.beginPath();
    ctx.moveTo(x + w - t / 2, y + h / 2);
    ctx.lineTo(x + w, y + h / 2 + gap);
    ctx.lineTo(x + w, y + h - gap - t);
    ctx.lineTo(x + w - t / 2, y + h - gap);
    ctx.lineTo(x + w - t, y + h - gap - t);
    ctx.lineTo(x + w - t, y + h / 2 + gap);
    ctx.fill();
  }

  // Segment d (bottom horizontal)
  if (pattern[3]) {
    ctx.beginPath();
    ctx.moveTo(x + gap, y + h - t / 2);
    ctx.lineTo(x + gap + t, y + h - t);
    ctx.lineTo(x + w - gap - t, y + h - t);
    ctx.lineTo(x + w - gap, y + h - t / 2);
    ctx.lineTo(x + w - gap - t, y + h);
    ctx.lineTo(x + gap + t, y + h);
    ctx.fill();
  }

  // Segment e (bottom left vertical)
  if (pattern[4]) {
    ctx.beginPath();
    ctx.moveTo(x + t / 2, y + h / 2);
    ctx.lineTo(x + t, y + h / 2 + gap);
    ctx.lineTo(x + t, y + h - gap - t);
    ctx.lineTo(x + t / 2, y + h - gap);
    ctx.lineTo(x, y + h - gap - t);
    ctx.lineTo(x, y + h / 2 + gap);
    ctx.fill();
  }

  // Segment f (top left vertical)
  if (pattern[5]) {
    ctx.beginPath();
    ctx.moveTo(x + t / 2, y + gap);
    ctx.lineTo(x + t, y + gap + t);
    ctx.lineTo(x + t, y + h / 2 - gap);
    ctx.lineTo(x + t / 2, y + h / 2);
    ctx.lineTo(x, y + h / 2 - gap);
    ctx.lineTo(x, y + gap + t);
    ctx.fill();
  }

  // Segment g (middle horizontal)
  if (pattern[6]) {
    ctx.beginPath();
    ctx.moveTo(x + gap, y + h / 2);
    ctx.lineTo(x + gap + t, y + h / 2 - t / 2);
    ctx.lineTo(x + w - gap - t, y + h / 2 - t / 2);
    ctx.lineTo(x + w - gap, y + h / 2);
    ctx.lineTo(x + w - gap - t, y + h / 2 + t / 2);
    ctx.lineTo(x + gap + t, y + h / 2 + t / 2);
    ctx.fill();
  }

  return w;
}

export function drawColon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): number {
  const dotSize = size * 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + dotSize, y + size * 0.3, dotSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + dotSize, y + size * 0.7, dotSize, 0, Math.PI * 2);
  ctx.fill();
  return dotSize * 2.5;
}

export interface DigitalClockParams {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  bottomY: number;
  dayFraction: number;
  digitSize: number;
  hands: number[];
  cyclesPerDay: number;
}

function getDigitalValue(
  dayFraction: number,
  handIndex: number,
  hands: number[],
  cyclesPerDay: number,
): number {
  let product = cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= Math.abs(hands[i]);
  }
  const totalUnits = dayFraction * product;

  if (handIndex === 0 && cyclesPerDay > 1) {
    return totalUnits % (Math.abs(hands[handIndex]) * cyclesPerDay);
  }
  return totalUnits % Math.abs(hands[handIndex]);
}

function getDigitalMaxUnits(handIndex: number, hands: number[], cyclesPerDay: number): number {
  if (handIndex === 0 && cyclesPerDay > 1) {
    return Math.abs(hands[handIndex]) * cyclesPerDay;
  }
  return Math.abs(hands[handIndex]);
}

export function drawDigitalClock(params: DigitalClockParams): void {
  const { ctx, centerX, bottomY, dayFraction, digitSize, hands, cyclesPerDay } = params;

  if (hands.length === 0) return;

  const color = '#00cc00';
  const digitWidth = digitSize * 0.6;
  const colonWidth = digitSize * 0.3;
  const spacing = digitSize * 0.15;

  // Calculate total width
  let totalWidth = 0;
  for (let i = 0; i < hands.length; i++) {
    const maxUnits = getDigitalMaxUnits(i, hands, cyclesPerDay);
    const digitCount = maxUnits.toString().length;
    totalWidth += digitCount * (digitWidth + spacing);
    if (i < hands.length - 1) {
      totalWidth += colonWidth + spacing;
    }
  }

  let x = centerX - totalWidth / 2;
  const y = bottomY - digitSize;

  for (let i = 0; i < hands.length; i++) {
    const value = Math.floor(getDigitalValue(dayFraction, i, hands, cyclesPerDay));
    const maxUnits = getDigitalMaxUnits(i, hands, cyclesPerDay);
    const digitCount = maxUnits.toString().length;
    const valueStr = value.toString().padStart(digitCount, '0');

    for (const char of valueStr) {
      drawSevenSegDigit(ctx, x, y, parseInt(char, 10), digitSize, color);
      x += digitWidth + spacing;
    }

    if (i < hands.length - 1) {
      drawColon(ctx, x, y, digitSize, color);
      x += colonWidth + spacing;
    }
  }
}
