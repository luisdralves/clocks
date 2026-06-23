// "DNA" packs every visible attribute of a Person (skin, hair color, hairline
// shape, quantized size) into one integer, printed as a 3-char base36 string.
// It isn't stable across palette changes: resize a palette and old hashes
// decode to a different person.

import { DNA_MAX_SIZE, DNA_MIN_SIZE, DNA_SIZE_BUCKETS } from './constants';
import { HAIR_PALETTE, HAIR_SHAPES, type HairShape, SKIN_COLORS } from './palette';

export interface Dna {
  skin: number;
  hair: number;
  shape: number;
  sizeBucket: number; // 0..DNA_SIZE_BUCKETS-1
}

export const DNA_DOMAINS: Record<keyof Dna, number> = {
  skin: SKIN_COLORS.length,
  hair: HAIR_PALETTE.length,
  shape: HAIR_SHAPES.length,
  sizeBucket: DNA_SIZE_BUCKETS,
};

export function encodeDna(d: Dna): string {
  let n = d.skin;
  n = n * HAIR_PALETTE.length + d.hair;
  n = n * HAIR_SHAPES.length + d.shape;
  n = n * DNA_SIZE_BUCKETS + d.sizeBucket;
  return n.toString(36).padStart(3, '0');
}

export function decodeDna(s: string): Dna | null {
  if (!/^[0-9a-z]+$/.test(s)) return null;
  let n = Number.parseInt(s, 36);
  if (Number.isNaN(n)) return null;
  const sizeBucket = n % DNA_SIZE_BUCKETS;
  n = Math.floor(n / DNA_SIZE_BUCKETS);
  const shape = n % HAIR_SHAPES.length;
  n = Math.floor(n / HAIR_SHAPES.length);
  const hair = n % HAIR_PALETTE.length;
  n = Math.floor(n / HAIR_PALETTE.length);
  const skin = n;
  if (skin >= SKIN_COLORS.length) return null;
  return { skin, hair, shape, sizeBucket };
}

export function dnaFromPerson(p: {
  skinColor: string;
  hairColor: string;
  hairShape: HairShape;
  size: number;
}): Dna {
  const skin = Math.max(0, SKIN_COLORS.indexOf(p.skinColor as (typeof SKIN_COLORS)[number]));
  const hair = Math.max(
    0,
    HAIR_PALETTE.findIndex((h) => h.color === p.hairColor),
  );
  const shape = Math.max(0, HAIR_SHAPES.indexOf(p.hairShape));
  const t = (p.size - DNA_MIN_SIZE) / (DNA_MAX_SIZE - DNA_MIN_SIZE);
  const sizeBucket = clampInt(Math.round(t * (DNA_SIZE_BUCKETS - 1)), 0, DNA_SIZE_BUCKETS - 1);
  return { skin, hair, shape, sizeBucket };
}

export interface DnaAttributes {
  skinColor: string;
  hairColor: string;
  hairShape: HairShape;
  size: number;
}

export function dnaToAttributes(d: Dna): DnaAttributes {
  const size =
    DNA_MIN_SIZE + (d.sizeBucket / (DNA_SIZE_BUCKETS - 1)) * (DNA_MAX_SIZE - DNA_MIN_SIZE);
  return {
    skinColor: SKIN_COLORS[d.skin],
    hairColor: HAIR_PALETTE[d.hair].color,
    hairShape: HAIR_SHAPES[d.shape],
    size,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
