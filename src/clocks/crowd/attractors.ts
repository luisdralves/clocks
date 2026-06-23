import {
  CLOCK_RADIUS_FRACTION,
  HAND_FALLOFF_FRACTION,
  HAND_INNER_FRACTION,
  HAND_LENGTHS,
  HAND_ROW_SPACING,
  HAND_ROWS,
  INDICATOR_FALLOFF_FRACTION,
  INDICATOR_INNER_FRACTION,
  INDICATOR_OUTER_FRACTION,
} from './constants';

export interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  falloff: number; // canvas px; bigger reaches farther
}

export function clockRadius(width: number, height: number): number {
  return Math.min(width, height) * CLOCK_RADIUS_FRACTION;
}

// The 12 hour-indicator segments plus N parallel hand-row segments for the
// given time, in absolute canvas px. `scale` adjusts fixed-pixel constants like
// HAND_ROW_SPACING so the layout holds across screen sizes.
export function buildAttractors(
  centerX: number,
  centerY: number,
  R: number,
  scale: number,
  now: Date,
): Segment[] {
  const segments: Segment[] = [];
  const indicatorFalloff = R * INDICATOR_FALLOFF_FRACTION;
  const handFalloff = R * HAND_FALLOFF_FRACTION;
  const rowSpacing = HAND_ROW_SPACING * scale;

  for (let h = 0; h < 12; h++) {
    const theta = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    segments.push({
      ax: centerX + cos * R * INDICATOR_INNER_FRACTION,
      ay: centerY + sin * R * INDICATOR_INNER_FRACTION,
      bx: centerX + cos * R * INDICATOR_OUTER_FRACTION,
      by: centerY + sin * R * INDICATOR_OUTER_FRACTION,
      falloff: indicatorFalloff,
    });
  }

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  const handAngles: Array<[number, number]> = [
    [(hours / 12) * Math.PI * 2 - Math.PI / 2, HAND_LENGTHS.hour],
    [(minutes / 60) * Math.PI * 2 - Math.PI / 2, HAND_LENGTHS.minute],
  ];
  for (const [angle, lenFrac] of handAngles) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ax = centerX + cos * R * HAND_INNER_FRACTION;
    const ay = centerY + sin * R * HAND_INNER_FRACTION;
    const bx = centerX + cos * R * lenFrac;
    const by = centerY + sin * R * lenFrac;
    const px = -sin;
    const py = cos;
    for (let k = 0; k < HAND_ROWS; k++) {
      const offset = (k - (HAND_ROWS - 1) / 2) * rowSpacing;
      segments.push({
        ax: ax + px * offset,
        ay: ay + py * offset,
        bx: bx + px * offset,
        by: by + py * offset,
        falloff: handFalloff,
      });
    }
  }

  return segments;
}

// Allocates a fresh object per call, ~3k times a frame at default settings.
// V8 handles that fine; if it ever shows up in a profile, switch to scratch
// out-params.
export interface ClosestPoint {
  x: number;
  y: number;
  d: number;
}

export function closestPointOnSegment(px: number, py: number, s: Segment): ClosestPoint {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const x = s.ax + t * dx;
  const y = s.ay + t * dy;
  return { x, y, d: Math.hypot(px - x, py - y) };
}
