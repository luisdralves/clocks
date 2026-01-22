interface SkyColor {
  hour: number;
  r: number;
  g: number;
  b: number;
}

const SKY_COLORS: SkyColor[] = [
  { hour: 0, r: 10, g: 15, b: 40 },
  { hour: 5, r: 15, g: 20, b: 50 },
  { hour: 6, r: 255, g: 140, b: 80 },
  { hour: 7, r: 135, g: 180, b: 220 },
  { hour: 12, r: 85, g: 170, b: 230 },
  { hour: 17, r: 135, g: 180, b: 220 },
  { hour: 18, r: 255, g: 100, b: 70 },
  { hour: 19, r: 80, g: 50, b: 90 },
  { hour: 21, r: 15, g: 20, b: 50 },
  { hour: 24, r: 10, g: 15, b: 40 },
];

export function getSkyColor(temporalSeconds: number): string {
  const hour = temporalSeconds / 3600;

  // Find surrounding colors and interpolate
  let lower = SKY_COLORS[0];
  let upper = SKY_COLORS[SKY_COLORS.length - 1];

  for (let i = 0; i < SKY_COLORS.length - 1; i++) {
    if (hour >= SKY_COLORS[i].hour && hour < SKY_COLORS[i + 1].hour) {
      lower = SKY_COLORS[i];
      upper = SKY_COLORS[i + 1];
      break;
    }
  }

  const range = upper.hour - lower.hour;
  const t = range > 0 ? (hour - lower.hour) / range : 0;

  const r = Math.round(lower.r + (upper.r - lower.r) * t);
  const g = Math.round(lower.g + (upper.g - lower.g) * t);
  const b = Math.round(lower.b + (upper.b - lower.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function isLightTime(temporalSeconds: number): boolean {
  const hour = temporalSeconds / 3600;
  return hour > 6.5 && hour < 17.5;
}
