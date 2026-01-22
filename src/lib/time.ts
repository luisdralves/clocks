import type { TimeComponents } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDayFraction(date: Date = new Date()): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return (date.getTime() - midnight.getTime()) / MS_PER_DAY;
}

export function getTimeComponents(date: Date = new Date()): TimeComponents {
  const milliseconds = date.getMilliseconds();
  const seconds = date.getSeconds() + milliseconds / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hours = date.getHours() + minutes / 60;
  const hours12 = hours % 12;

  return {
    hours,
    hours12,
    minutes,
    seconds,
    milliseconds,
    dayFraction: getDayFraction(date),
  };
}

export function valueToAngle(
  value: number,
  max: number,
  startAngle: number = -Math.PI / 2,
): number {
  return (value / max) * Math.PI * 2 + startAngle;
}

export function hoursToAngle(hours: number, is24Hour: boolean = false): number {
  const max = is24Hour ? 24 : 12;
  return valueToAngle(hours % max, max);
}

export function minutesToAngle(minutes: number): number {
  return valueToAngle(minutes % 60, 60);
}

export function secondsToAngle(seconds: number): number {
  return valueToAngle(seconds % 60, 60);
}
