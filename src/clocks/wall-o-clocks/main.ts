import { createAnimationLoop } from '@/lib/animation';
import { createResizeHandler, setupCanvas } from '@/lib/canvas';
import type { CanvasContext } from '@/lib/types';
import digits from './digits.json';

type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type DigitData = Record<string, [Direction, Direction]>;
type DigitsData = Record<string, DigitData>;

const typedDigits = digits as unknown as DigitsData;

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Canvas not found');

let ctx: CanvasContext = setupCanvas(canvas);
let isPortrait = window.innerHeight > window.innerWidth;

createResizeHandler(canvas, (newCtx) => {
  ctx = newCtx;
  isPortrait = window.innerHeight > window.innerWidth;
});

const HORIZONTAL_N = 28;
const VERTICAL_N = 12;

type ClockState = [number, number, number, number]; // hourAngle, minuteAngle, secondAngle, colorFactor

const previousState = new Map<string, ClockState>();
for (let i = 0; i < VERTICAL_N; i++) {
  for (let j = 0; j < HORIZONTAL_N; j++) {
    previousState.set(`${i},${j}`, [(3 * Math.PI) / 2, (3 * Math.PI) / 2, (3 * Math.PI) / 2, 0]);
  }
}

const INITIAL_INTERPOLATION_FACTOR = 0.95;
const BASE_INTERPOLATION_FACTOR = 0.75;
const INITIAL_ANIMATION_THRESHOLD = 0.2;
let isInitialAnimationDone = false;

function interpolate(
  previousValue: number,
  nextValue: number,
  interpolationFactor: number,
): number {
  return interpolationFactor * previousValue + (1 - interpolationFactor) * nextValue;
}

function normalizeAngle(angle: number): number {
  let mutableAngle = angle;
  while (mutableAngle < 0) mutableAngle += 2 * Math.PI;
  while (mutableAngle >= 2 * Math.PI) mutableAngle -= 2 * Math.PI;
  return mutableAngle;
}

function shortestAngleDiff(a: number, b: number): number {
  let angleDiff = b - a;
  if (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  } else if (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  return angleDiff;
}

function interpolateAngle(
  previousAngle: number,
  nextAngle: number,
  interpolationFactor: number,
): number {
  const normalizedPreviousAngle = normalizeAngle(previousAngle);
  const normalizedNextAngle = normalizeAngle(nextAngle);
  const angleDiff = shortestAngleDiff(normalizedPreviousAngle, normalizedNextAngle);
  const interpolatedAngle = normalizedPreviousAngle + angleDiff * (1 - interpolationFactor);
  return normalizeAngle(interpolatedAngle);
}

function directionToAngle(direction: Direction): number {
  switch (direction) {
    case 'E':
      return 0;
    case 'SE':
      return Math.PI / 4;
    case 'S':
      return Math.PI / 2;
    case 'SW':
      return (3 * Math.PI) / 4;
    case 'W':
      return Math.PI;
    case 'NW':
      return (5 * Math.PI) / 4;
    case 'N':
      return (3 * Math.PI) / 2;
    case 'NE':
      return (7 * Math.PI) / 4;
  }
}

function getDigitAt(digit: string, x: number, y: number): ClockState | null {
  const key = `${x - 1},${y - 3}`;
  const digitData = typedDigits[digit]?.[key];
  if (digitData) {
    return [
      directionToAngle(digitData[0]),
      directionToAngle(digitData[1]),
      directionToAngle(digitData[0]),
      1,
    ];
  }
  return null;
}

function getClockAngles(y: number, x: number, now: Date): ClockState {
  const hoursStr = String(now.getHours()).padStart(2, '0');
  const [tensHoursDigit, onesHoursDigit] = hoursStr.split('');
  const tensHours = getDigitAt(tensHoursDigit, x, y);
  if (tensHours) return tensHours;
  const onesHours = getDigitAt(onesHoursDigit, x - 4, y);
  if (onesHours) return onesHours;

  const minutesStr = String(now.getMinutes()).padStart(2, '0');
  const [tensMinutesDigit, onesMinutesDigit] = minutesStr.split('');
  const tensMinutes = getDigitAt(tensMinutesDigit, x - 9, y);
  if (tensMinutes) return tensMinutes;
  const onesMinutes = getDigitAt(onesMinutesDigit, x - 13, y);
  if (onesMinutes) return onesMinutes;

  const secondsStr = String(now.getSeconds()).padStart(2, '0');
  const [tensSecondsDigit, onesSecondsDigit] = secondsStr.split('');
  const tensSeconds = getDigitAt(tensSecondsDigit, x - 18, y);
  if (tensSeconds) return tensSeconds;
  const onesSeconds = getDigitAt(onesSecondsDigit, x - 22, y);
  if (onesSeconds) return onesSeconds;

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secondAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;

  return [hourAngle, minuteAngle, secondAngle, 0];
}

const animation = createAnimationLoop({
  fps: 30,
  onFrame: () => {
    const { ctx: context, width, height } = ctx;

    context.fillStyle = '#888';
    context.fillRect(0, 0, width, height);

    if (isPortrait) {
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(-Math.PI / 2);
      context.translate(-height / 2, -width / 2);
    }

    const drawWidth = isPortrait ? height : width;
    const drawHeight = isPortrait ? width : height;

    const cellWidth = drawWidth / HORIZONTAL_N;
    const cellHeight = drawHeight / VERTICAL_N;
    const unit = Math.min(cellWidth, cellHeight);
    const xOffset =
      cellHeight < cellWidth ? (Math.abs(cellWidth - cellHeight) * HORIZONTAL_N) / 2 : 0;
    const yOffset =
      cellWidth < cellHeight ? (Math.abs(cellHeight - cellWidth) * VERTICAL_N) / 2 : 0;

    const now = new Date();
    const interpolationFactor = isInitialAnimationDone
      ? BASE_INTERPOLATION_FACTOR
      : INITIAL_INTERPOLATION_FACTOR;

    for (let i = 0; i < VERTICAL_N; i++) {
      for (let j = 0; j < HORIZONTAL_N; j++) {
        const x = (j + 0.5) * unit + xOffset;
        const y = (i + 0.5) * unit + yOffset;
        const radius = unit * 0.5;

        context.beginPath();
        context.fillStyle = 'white';
        context.lineWidth = 1;
        context.strokeStyle = '#888';
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        const angles = getClockAngles(i, j, now);
        const [nextHourAngle, nextMinuteAngle, nextSecondAngle, nextColorFactor] = angles;
        const prevState = previousState.get(`${i},${j}`)!;
        const [previousHourAngle, previousMinuteAngle, previousSecondAngle, previousColorFactor] =
          prevState;

        if (
          i === 0 &&
          j === 0 &&
          !isInitialAnimationDone &&
          Math.abs(shortestAngleDiff(nextSecondAngle, previousSecondAngle)) <
            INITIAL_ANIMATION_THRESHOLD &&
          Math.abs(shortestAngleDiff(nextMinuteAngle, previousMinuteAngle)) <
            INITIAL_ANIMATION_THRESHOLD &&
          Math.abs(shortestAngleDiff(nextHourAngle, previousHourAngle)) <
            INITIAL_ANIMATION_THRESHOLD
        ) {
          isInitialAnimationDone = true;
        }

        const hourAngle = interpolateAngle(previousHourAngle, nextHourAngle, interpolationFactor);
        const minuteAngle = interpolateAngle(
          previousMinuteAngle,
          nextMinuteAngle,
          interpolationFactor,
        );
        const secondAngle = interpolateAngle(
          previousSecondAngle,
          nextSecondAngle,
          interpolationFactor,
        );
        const colorFactor = interpolate(previousColorFactor, nextColorFactor, interpolationFactor);
        const baseThickness = (radius * (colorFactor + 1)) / 2;
        const baseLength = (radius * (colorFactor + 7)) / 8;

        previousState.set(`${i},${j}`, [hourAngle, minuteAngle, secondAngle, colorFactor]);

        const colorHex = Math.floor(8 * (1 - colorFactor)).toString(16);
        const handColor = `#${colorHex}${colorHex}${colorHex}`;

        context.beginPath();
        context.strokeStyle = handColor;
        context.lineWidth = baseThickness * 0.08;
        context.moveTo(x, y);
        context.lineTo(
          x + Math.cos(hourAngle) * baseLength * 0.7,
          y + Math.sin(hourAngle) * baseLength * 0.7,
        );
        context.stroke();

        context.beginPath();
        context.lineWidth = baseThickness * 0.065;
        context.moveTo(x, y);
        context.lineTo(
          x + Math.cos(minuteAngle) * baseLength * 0.9,
          y + Math.sin(minuteAngle) * baseLength * 0.9,
        );
        context.stroke();

        context.beginPath();
        context.lineWidth = baseThickness * 0.04;
        context.moveTo(x, y);
        context.lineTo(
          x + Math.cos(secondAngle) * baseLength * 0.95,
          y + Math.sin(secondAngle) * baseLength * 0.95,
        );
        context.stroke();
      }
    }

    if (isPortrait) {
      context.restore();
    }
  },
});

animation.start();
