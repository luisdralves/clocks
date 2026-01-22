export interface Point2D {
  x: number;
  y: number;
}

export interface ArcLengthEntry {
  t: number;
  arcLength: number;
}

const VERTICAL_STRETCH = 1.25;
const ARC_LENGTH_SAMPLES = 1000;

export function lemniscatePoint(t: number, scale: number): Point2D {
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);
  const denom = 1 + sinT * sinT;
  const x = (-scale * cosT) / denom; // Negated to put morning on the right
  const y = (scale * sinT * cosT * VERTICAL_STRETCH) / denom;
  return { x, y };
}

export function lemniscateNormal(t: number): Point2D {
  const delta = 0.001;
  const p1 = lemniscatePoint(t - delta, 1);
  const p2 = lemniscatePoint(t + delta, 1);
  const point = lemniscatePoint(t, 1);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Normal is perpendicular to tangent: rotate 90 degrees
  let nx = -dy / len;
  let ny = dx / len;
  // Ensure normal points inward (toward center)
  if (nx * point.x + ny * point.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

export interface ArcLengthTable {
  entries: ArcLengthEntry[];
  totalLength: number;
}

export function buildArcLengthTable(): ArcLengthTable {
  const entries: ArcLengthEntry[] = [];
  let totalArcLength = 0;

  for (let i = 0; i <= ARC_LENGTH_SAMPLES; i++) {
    const t = (i / ARC_LENGTH_SAMPLES) * Math.PI * 2;
    if (i > 0) {
      const prevT = ((i - 1) / ARC_LENGTH_SAMPLES) * Math.PI * 2;
      const p1 = lemniscatePoint(prevT, 1);
      const p2 = lemniscatePoint(t, 1);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      totalArcLength += Math.sqrt(dx * dx + dy * dy);
    }
    entries.push({ t, arcLength: totalArcLength });
  }

  return { entries, totalLength: totalArcLength };
}

export function arcLengthToT(normalizedArc: number, table: ArcLengthTable): number {
  const targetLength = normalizedArc * table.totalLength;
  const { entries } = table;

  let low = 0;
  let high = entries.length - 1;

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (entries[mid].arcLength < targetLength) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const a = entries[low];
  const b = entries[high];
  const segmentLength = b.arcLength - a.arcLength;
  const segmentFraction = segmentLength > 0 ? (targetLength - a.arcLength) / segmentLength : 0;
  return a.t + segmentFraction * (b.t - a.t);
}

export const LEMNISCATE_WIDTH = 2;
export const LEMNISCATE_HEIGHT = VERTICAL_STRETCH;
