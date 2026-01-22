export type NumberStyle = 'arabic' | 'roman' | 'none';

export interface ClockConfig {
  hands: number[];
  numberStyle: NumberStyle;
  cyclesPerDay: number;
}

export type PresetName =
  | 'regular12'
  | 'regular24'
  | 'inverted'
  | 'decimal'
  | 'hexadecimal'
  | 'binary';

export const PRESETS: Record<PresetName, ClockConfig> = {
  regular12: {
    hands: [12, 60, 60],
    numberStyle: 'arabic',
    cyclesPerDay: 2,
  },
  regular24: {
    hands: [24, 60, 60],
    numberStyle: 'arabic',
    cyclesPerDay: 1,
  },
  inverted: {
    hands: [-12, -60, -60],
    numberStyle: 'arabic',
    cyclesPerDay: 2,
  },
  decimal: {
    hands: [10, 10, 10],
    numberStyle: 'arabic',
    cyclesPerDay: 1,
  },
  hexadecimal: {
    hands: [16, 16, 16, 16],
    numberStyle: 'arabic',
    cyclesPerDay: 1,
  },
  binary: {
    hands: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    numberStyle: 'none',
    cyclesPerDay: 1,
  },
};

export function detectPreset(config: ClockConfig): PresetName | 'custom' {
  for (const [name, preset] of Object.entries(PRESETS) as [PresetName, ClockConfig][]) {
    if (
      preset.hands.length === config.hands.length &&
      preset.numberStyle === config.numberStyle &&
      preset.cyclesPerDay === config.cyclesPerDay &&
      preset.hands.every((units, i) => units === config.hands[i])
    ) {
      return name;
    }
  }
  return 'custom';
}

export function getHandLength(index: number, total: number): number {
  const n = index;
  const t = total;
  return (0.85 * (n + 2 * t) ** 2) / (3 * t - 1) ** 2;
}

export function getHandWidth(index: number, total: number): number {
  if (total <= 1) return 0.04;
  return 0.02 + (0.04 * (total - 1 - index)) / (total - 1);
}

export function getHandColor(index: number, total: number): string {
  return index === total - 1 ? '#ff0000' : '#000000';
}

const SECONDS_PER_DAY = 86400;

export function getSecondsPerTick(
  handIndex: number,
  hands: number[],
  cyclesPerDay: number,
): number {
  let product = cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= Math.abs(hands[i]);
  }
  return SECONDS_PER_DAY / product;
}

export function shouldUseSpring(handIndex: number, hands: number[], cyclesPerDay: number): boolean {
  const secondsPerTick = getSecondsPerTick(handIndex, hands, cyclesPerDay);
  return secondsPerTick >= 0.25 && secondsPerTick <= 10;
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    if (Number.isInteger(hours)) return `${hours}h`;
    return `${hours.toFixed(2)}h`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    if (Number.isInteger(minutes)) return `${minutes}m`;
    return `${minutes.toFixed(2)}m`;
  }
  if (Number.isInteger(seconds)) return `${seconds}s`;
  if (seconds >= 1) return `${seconds.toFixed(2)}s`;
  return `${(seconds * 1000).toFixed(0)}ms`;
}
