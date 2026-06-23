import { buildAttractors, closestPointOnSegment } from './attractors';
import {
  ANIM_MIN_SPEED,
  ANIM_VELOCITY_SMOOTHING,
  ATTRACTOR_STRENGTH,
  BASE_GAIT_FREQUENCY,
  EDGE_BIAS_STRENGTH,
  EDGE_BIAS_ZONE_FRACTION,
  FACING_SMOOTHING,
  FACING_SPEED_THRESHOLD,
  PERSON_SIZE_VARIATION,
  REPULSION_FAR_RADIUS,
  REPULSION_FAR_STRENGTH,
  REPULSION_RADIUS,
  REPULSION_STRENGTH,
  ROLE_SWITCH_RATE,
  TEMPERATURE,
  VELOCITY_DAMPING,
  WALK_SPEED_MAX,
  WANDERER_BOUND_PADDING,
  WANDERER_BOUND_STRENGTH,
  WANDERER_MIN_DISTANCE,
  WANDERER_PRESSURE_SCALE,
  WANDERER_PRESSURE_STRENGTH,
  WANDERER_SEPARATION_RATE,
} from './constants';
import { type HairShape, pickHair, pickHairShape, pickSkin } from './palette';

export type Role = 'wanderer' | 'complyer';

export interface Person {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Smoothed (low-passed) velocity, used to drive gait and facing so they
  // follow sustained motion instead of per-frame force jitter.
  svx: number;
  svy: number;
  role: Role;
  size: number; // multiplier on PERSON_RADIUS
  facing: number;
  gaitPhase: number; // radians
  skinColor: string;
  hairColor: string;
  hairShape: HairShape;
}

export function createPerson(width: number, height: number, role: Role, scale: number): Person {
  const margin = WANDERER_BOUND_PADDING * scale;
  return {
    x: margin + Math.random() * (width - 2 * margin),
    y: margin + Math.random() * (height - 2 * margin),
    vx: 0,
    vy: 0,
    svx: 0,
    svy: 0,
    role,
    size: 1 + (Math.random() - 0.5) * PERSON_SIZE_VARIATION,
    facing: Math.random() * Math.PI * 2,
    gaitPhase: Math.random() * Math.PI * 2,
    skinColor: pickSkin(),
    hairColor: pickHair(),
    hairShape: pickHairShape(),
  };
}

export interface SimContext {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  clockR: number;
  // min(w,h) / DESIGN_MIN_DIM; scales every length/force/speed constant.
  scale: number;
}

export function stepSimulation(people: Person[], dt: number, ctx: SimContext): void {
  const attractors = buildAttractors(ctx.centerX, ctx.centerY, ctx.clockR, ctx.scale, new Date());

  swapRoles(people, dt, ctx);
  integrateForces(people, attractors, dt, ctx);
  enforceWandererSeparation(people, ctx.scale);
}

// Role turnover by 1-for-1 swap. Each wanderer rolls a position-dependent flip
// chance; on a hit it becomes a complyer and a random complyer becomes a
// wanderer the same step. Counts stay exact: the startup ratio holds forever.
//
// A complyer flipped to wanderer at index > i can be hit again by the same loop
// this frame. At ROLE_SWITCH_RATE that's negligible (~1e-4 per frame per
// wanderer); if the rate ever climbs, snapshot the wanderer indices first.
function swapRoles(people: Person[], dt: number, ctx: SimContext): void {
  let complyerCount = 0;
  for (const p of people) if (p.role === 'complyer') complyerCount++;
  if (complyerCount === 0) return;

  // Per-axis bias zone widths: the outer EDGE_BIAS_ZONE_FRACTION of the
  // empty space between the clock and each viewport edge.
  const biasZoneX = Math.max(0, ctx.width / 2 - ctx.clockR) * EDGE_BIAS_ZONE_FRACTION;
  const biasZoneY = Math.max(0, ctx.height / 2 - ctx.clockR) * EDGE_BIAS_ZONE_FRACTION;

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    if (p.role !== 'wanderer') continue;

    const edgeDistX = Math.min(p.x, ctx.width - p.x);
    const edgeDistY = Math.min(p.y, ctx.height - p.y);
    const proxX = biasZoneX > 0 ? Math.max(0, 1 - edgeDistX / biasZoneX) : 0;
    const proxY = biasZoneY > 0 ? Math.max(0, 1 - edgeDistY / biasZoneY) : 0;
    const edgeProx = Math.max(proxX, proxY);
    const flipRate = ROLE_SWITCH_RATE * (1 + edgeProx * EDGE_BIAS_STRENGTH);
    if (Math.random() >= flipRate * dt) continue;

    // Pick the Nth complyer uniformly by linear scan. O(N) per swap, fine at
    // this rate.
    let target = Math.floor(Math.random() * complyerCount);
    for (const q of people) {
      if (q.role !== 'complyer') continue;
      if (target === 0) {
        p.role = 'complyer';
        q.role = 'wanderer';
        break;
      }
      target--;
    }
  }
}

// Spatial hash for the pairwise repulsion loop. Cells are sized to the
// long-range repulsion radius (at the current scale), so a person's potential
// partners always lie in the 3×3 block around their cell. Buckets live at
// module level and are reused across frames.
let bucketGrid: number[][] = [];
let bucketCols = 0;
let bucketRows = 0;

function getBucketGrid(cols: number, rows: number): number[][] {
  if (cols !== bucketCols || rows !== bucketRows) {
    bucketCols = cols;
    bucketRows = rows;
    bucketGrid = Array.from({ length: cols * rows }, () => []);
  } else {
    for (const bucket of bucketGrid) bucket.length = 0;
  }
  return bucketGrid;
}

function integrateForces(
  people: Person[],
  attractors: ReturnType<typeof buildAttractors>,
  dt: number,
  ctx: SimContext,
): void {
  const N = people.length;
  const s = ctx.scale;
  const damp = Math.exp(-VELOCITY_DAMPING * dt);
  const animSmoothing = 1 - Math.exp(-ANIM_VELOCITY_SMOOTHING * dt);
  const facingSmoothing = 1 - Math.exp(-FACING_SMOOTHING * dt);
  const repulsionRadius = REPULSION_RADIUS * s;
  const repulsionFarRadius = REPULSION_FAR_RADIUS * s;
  const repulsionRadius2 = repulsionRadius * repulsionRadius;
  const repulsionFarRadius2 = repulsionFarRadius * repulsionFarRadius;
  const repulsionStrength = REPULSION_STRENGTH * s;
  const repulsionFarStrength = REPULSION_FAR_STRENGTH * s;
  const attractorStrength = ATTRACTOR_STRENGTH * s;
  const wandererPressureStrength = WANDERER_PRESSURE_STRENGTH * s;
  const wandererPressureScale = WANDERER_PRESSURE_SCALE * s;
  const wandererBoundPadding = WANDERER_BOUND_PADDING * s;
  const walkSpeedMax = WALK_SPEED_MAX * s;
  const temperature = TEMPERATURE * s;
  const cellSize = repulsionFarRadius;

  const fxs = new Float64Array(N);
  const fys = new Float64Array(N);

  // Phase 1: per-person forces (attractor / wanderer drive / bounds / jitter).
  for (let i = 0; i < N; i++) {
    const p = people[i];
    let fx = 0;
    let fy = 0;
    if (p.role === 'complyer') {
      // Inverse-square law with a soft core (`falloff +` avoids the singularity
      // at d=0), so it's always nonzero and the field has no dead zones.
      //   magnitude = STRENGTH · falloff² / (falloff + d)²
      for (const seg of attractors) {
        const cp = closestPointOnSegment(p.x, p.y, seg);
        if (cp.d < 0.001) continue;
        const ratio = seg.falloff / (seg.falloff + cp.d);
        const w = ratio * ratio;
        const invD = 1 / cp.d;
        fx += attractorStrength * (cp.x - p.x) * invD * w;
        fy += attractorStrength * (cp.y - p.y) * invD * w;
      }
    } else {
      // Wanderers: viewport bound plus a long-range "crowd pressure", a
      // soft-core inverse-square push from every other person. The push is
      // deliberately uncapped: any distance cutoff brings back dead zones where
      // a wanderer stalls. The O(W·N) cost buys a direction that always points
      // away from the crowd.
      const minX = wandererBoundPadding;
      const maxX = ctx.width - wandererBoundPadding;
      const minY = wandererBoundPadding;
      const maxY = ctx.height - wandererBoundPadding;
      if (p.x < minX) fx += (minX - p.x) * WANDERER_BOUND_STRENGTH;
      else if (p.x > maxX) fx -= (p.x - maxX) * WANDERER_BOUND_STRENGTH;
      if (p.y < minY) fy += (minY - p.y) * WANDERER_BOUND_STRENGTH;
      else if (p.y > maxY) fy -= (p.y - maxY) * WANDERER_BOUND_STRENGTH;

      for (let j = 0; j < people.length; j++) {
        if (j === i) continue;
        const q = people[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) continue;
        const d = Math.sqrt(d2);
        const ratio = wandererPressureScale / (wandererPressureScale + d);
        const w = ratio * ratio;
        const invD = 1 / d;
        fx += wandererPressureStrength * dx * invD * w;
        fy += wandererPressureStrength * dy * invD * w;
      }
    }
    fx += (Math.random() - 0.5) * 2 * temperature;
    fy += (Math.random() - 0.5) * 2 * temperature;
    fxs[i] = fx;
    fys[i] = fy;
  }

  // Phase 2: pairwise repulsion via spatial hash. Bucket people by cell, then
  // for each person look only at the 3×3 block around them. Each pair (i, j)
  // with j > i is visited once and the force applied to both.
  const cols = Math.max(1, Math.ceil(ctx.width / cellSize));
  const rows = Math.max(1, Math.ceil(ctx.height / cellSize));
  const buckets = getBucketGrid(cols, rows);
  const cellX = new Int16Array(N);
  const cellY = new Int16Array(N);
  for (let i = 0; i < N; i++) {
    const p = people[i];
    const cx = clampInt(Math.floor(p.x / cellSize), 0, cols - 1);
    const cy = clampInt(Math.floor(p.y / cellSize), 0, rows - 1);
    cellX[i] = cx;
    cellY[i] = cy;
    buckets[cy * cols + cx].push(i);
  }

  for (let i = 0; i < N; i++) {
    const p = people[i];
    const cx = cellX[i];
    const cy = cellY[i];
    const yMin = Math.max(0, cy - 1);
    const yMax = Math.min(rows - 1, cy + 1);
    const xMin = Math.max(0, cx - 1);
    const xMax = Math.min(cols - 1, cx + 1);
    for (let ny = yMin; ny <= yMax; ny++) {
      for (let nx = xMin; nx <= xMax; nx++) {
        const bucket = buckets[ny * cols + nx];
        for (let k = 0; k < bucket.length; k++) {
          const j = bucket[k];
          if (j <= i) continue;
          const q = people[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= repulsionFarRadius2 || d2 === 0) continue;
          const d = Math.sqrt(d2);
          let force = repulsionFarStrength * (1 - d / repulsionFarRadius);
          if (d2 < repulsionRadius2) {
            force += repulsionStrength * (1 - d / repulsionRadius);
          }
          const ux = (dx / d) * force;
          const uy = (dy / d) * force;
          fxs[i] += ux;
          fys[i] += uy;
          fxs[j] -= ux;
          fys[j] -= uy;
        }
      }
    }
  }

  // Phase 3: integrate velocity & position, then advance animation state.
  for (let i = 0; i < N; i++) {
    const p = people[i];
    p.vx = (p.vx + fxs[i] * dt) * damp;
    p.vy = (p.vy + fys[i] * dt) * damp;

    const v = Math.hypot(p.vx, p.vy);
    if (v > walkSpeedMax) {
      p.vx = (p.vx / v) * walkSpeedMax;
      p.vy = (p.vy / v) * walkSpeedMax;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.svx += (p.vx - p.svx) * animSmoothing;
    p.svy += (p.vy - p.svy) * animSmoothing;
    advanceGait(p, dt, facingSmoothing, s);
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function advanceGait(p: Person, dt: number, facingSmoothing: number, scale: number): void {
  const sSpeed = Math.hypot(p.svx, p.svy);
  const animMinSpeed = ANIM_MIN_SPEED * scale;
  const walkSpeedMax = WALK_SPEED_MAX * scale;
  const normSpeed = clamp01((sSpeed - animMinSpeed) / (walkSpeedMax - animMinSpeed));
  p.gaitPhase += BASE_GAIT_FREQUENCY * 2 * Math.PI * normSpeed * dt;
  if (sSpeed > FACING_SPEED_THRESHOLD * scale) {
    const target = Math.atan2(p.svy, p.svx);
    let diff = target - p.facing;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    p.facing += diff * facingSmoothing;
  }
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

// Direct positional separation that bypasses the speed cap, letting wanderers
// shove through clusters faster than the cap would otherwise allow.
//
// Naive O(N²) pass that skips Phase 2's spatial hash. At ~240 people the cost
// is trivial; if the population ever grows enough to matter, move this onto the
// same bucket grid the repulsion pass builds.
function enforceWandererSeparation(people: Person[], scale: number): void {
  const minDist = WANDERER_MIN_DISTANCE * scale;
  const minD2 = minDist * minDist;
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    for (let j = i + 1; j < people.length; j++) {
      const q = people[j];
      if (p.role !== 'wanderer' && q.role !== 'wanderer') continue;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (minDist - d) * WANDERER_SEPARATION_RATE * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        p.x += nx * push;
        p.y += ny * push;
        q.x -= nx * push;
        q.y -= ny * push;
      }
    }
  }
}
