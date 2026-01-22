export interface SpiralPoint {
  x: number;
  y: number;
  angle: number;
}

export interface SpiralConfig {
  outerLevels: number;
  innerLevels: number;
  baseRadius: number;
  ratio: number;
}

export const DEFAULT_SPIRAL_CONFIG: SpiralConfig = {
  outerLevels: 3,
  innerLevels: 5,
  baseRadius: 0.5,
  ratio: 0.5,
};

export function spiralRadius(
  position: number,
  level: number,
  config: SpiralConfig = DEFAULT_SPIRAL_CONFIG,
): number {
  return config.baseRadius * config.ratio ** (level + position);
}

export function spiralPoint(
  position: number,
  level: number,
  scale: number,
  config: SpiralConfig = DEFAULT_SPIRAL_CONFIG,
): SpiralPoint {
  const angle = position * Math.PI * 2 - Math.PI / 2;
  const radius = spiralRadius(position, level, config) * scale;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    angle,
  };
}

export interface DopplerColor {
  r: number;
  g: number;
  b: number;
}

export function getDopplerColor(distance: number): DopplerColor {
  if (distance < 0) {
    const t = Math.min(1, Math.abs(distance) / 2);
    return {
      r: 255,
      g: Math.round(255 * (1 - t)),
      b: Math.round(255 * (1 - t)),
    };
  } else {
    const t = Math.min(1, Math.abs(distance) / 2);
    return {
      r: Math.round(255 * (1 - t)),
      g: Math.round(255 * (1 - t)),
      b: 255,
    };
  }
}

export function colorToRgb(color: DopplerColor): string {
  return `rgb(${color.r},${color.g},${color.b})`;
}
