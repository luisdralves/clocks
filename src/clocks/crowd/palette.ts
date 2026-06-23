// Variation palettes and their sampling weights. Skin is uniform; hair color
// and shape are weighted to roughly match real-world frequencies. `bald` is a
// shape, not a hair color, since a bald head has no hair to color.

export const SKIN_COLORS = [
  '#f1d4a8',
  '#dab48b',
  '#bf9670',
  '#a07857',
  '#7a563d',
  '#553a26',
] as const;

export interface HairColor {
  color: string;
  name: string;
  weight: number;
}

export const HAIR_PALETTE: readonly HairColor[] = [
  { color: '#1a1410', name: 'black', weight: 0.43 },
  { color: '#5a3a1f', name: 'brown', weight: 0.32 },
  { color: '#d6b870', name: 'blond', weight: 0.14 },
  { color: '#a64b2a', name: 'red', weight: 0.03 },
  { color: '#b5b1a8', name: 'gray', weight: 0.08 },
];

export const HAIR_SHAPES = ['convex', 'concave', 'parted', 'balding', 'bald'] as const;
export type HairShape = (typeof HAIR_SHAPES)[number];

export const HAIR_SHAPE_WEIGHTS: Record<HairShape, number> = {
  convex: 0.32,
  concave: 0.28,
  parted: 0.28,
  balding: 0.06,
  bald: 0.06,
};

export function pickWeighted<T>(items: readonly { weight: number }[], values: readonly T[]): T {
  let r = Math.random();
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return values[i];
  }
  return values[values.length - 1];
}

export function pickSkin(): string {
  return SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)];
}

export function pickHair(): string {
  return pickWeighted(
    HAIR_PALETTE,
    HAIR_PALETTE.map((h) => h.color),
  );
}

export function pickHairShape(): HairShape {
  return pickWeighted(
    HAIR_SHAPES.map((s) => ({ weight: HAIR_SHAPE_WEIGHTS[s] })),
    HAIR_SHAPES,
  );
}

export function hairName(color: string): string {
  return HAIR_PALETTE.find((h) => h.color === color)?.name ?? '?';
}
