// Maps the design-size constants to the current viewport. Lengths, forces, and
// speeds are multiplied by `scale = min(w, h) / DESIGN_MIN_DIM` where they're
// used. Population counts come from clock geometry and the configured
// complyer/wanderer density.

import {
  CLOCK_RADIUS_FRACTION,
  DESIGN_COMPLYERS,
  DESIGN_MIN_DIM,
  DESIGN_WANDERER_DENSITY,
} from './constants';

export function getScale(width: number, height: number): number {
  return Math.min(width, height) / DESIGN_MIN_DIM;
}

export interface Population {
  complyers: number;
  wanderers: number;
  total: number;
}

export function getPopulation(width: number, height: number): Population {
  const R = Math.min(width, height) * CLOCK_RADIUS_FRACTION;
  const wingArea = Math.max(0, width * height - Math.PI * R * R);
  const wingAreaOverR2 = wingArea / (R * R);
  const wanderers = Math.max(0, Math.round(DESIGN_WANDERER_DENSITY * wingAreaOverR2));
  return { complyers: DESIGN_COMPLYERS, wanderers, total: DESIGN_COMPLYERS + wanderers };
}
