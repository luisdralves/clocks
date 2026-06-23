import {
  ANIM_MIN_SPEED,
  ARM_SWING_FACTOR,
  HAIRLINE_PARAMS,
  LIMB_RADIUS_FACTOR,
  PERSON_RADIUS,
  SHOULDER_OFFSET_FACTOR,
  STROKE_COLOR,
  STROKE_FRACTION,
  STROKE_MIN_PX,
  WALK_SPEED_MAX,
} from './constants';
import type { Person } from './simulation';

export function drawPerson(c2d: CanvasRenderingContext2D, p: Person, scale: number): void {
  const r = PERSON_RADIUS * scale * p.size;
  const limb = r * LIMB_RADIUS_FACTOR;
  const facingX = Math.cos(p.facing);
  const facingY = Math.sin(p.facing);
  const sideX = -facingY;
  const sideY = facingX;

  const sSpeed = Math.hypot(p.svx, p.svy);
  const animMin = ANIM_MIN_SPEED * scale;
  const speedMax = WALK_SPEED_MAX * scale;
  const amp = clamp01((sSpeed - animMin) / (speedMax - animMin));

  const swingRight = Math.sin(p.gaitPhase) * amp * r * ARM_SWING_FACTOR;
  const swingLeft = -swingRight;
  const shoulder = r * SHOULDER_OFFSET_FACTOR;

  c2d.strokeStyle = STROKE_COLOR;
  c2d.lineWidth = Math.max(STROKE_MIN_PX * scale, r * STROKE_FRACTION);
  c2d.lineJoin = 'round';

  // Arms first; the head is drawn on top so arms only show outside the head silhouette.
  c2d.fillStyle = p.skinColor;
  drawCircle(
    c2d,
    p.x + sideX * shoulder + facingX * swingRight,
    p.y + sideY * shoulder + facingY * swingRight,
    limb,
  );
  drawCircle(
    c2d,
    p.x - sideX * shoulder + facingX * swingLeft,
    p.y - sideY * shoulder + facingY * swingLeft,
    limb,
  );

  // Head and hair are drawn in head-local coords (facing toward +x) so the
  // hairline math reads naturally.
  c2d.save();
  c2d.translate(p.x, p.y);
  c2d.rotate(p.facing);

  c2d.fillStyle = p.skinColor;
  c2d.beginPath();
  c2d.arc(0, 0, r, 0, Math.PI * 2);
  c2d.fill();
  c2d.stroke();

  if (p.hairShape !== 'bald') {
    c2d.fillStyle = p.hairColor;
    c2d.beginPath();
    if (p.hairShape === 'balding') {
      traceHorseshoe(c2d, r);
    } else {
      traceFringe(c2d, r, p.hairShape);
    }
    c2d.fill();
    c2d.stroke();
  }

  c2d.restore();
}

function drawCircle(c2d: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c2d.beginPath();
  c2d.arc(x, y, r, 0, Math.PI * 2);
  c2d.fill();
  c2d.stroke();
}

// Hairline that wraps the back of the head and closes with a quadratic curve at
// the front (convex, concave, parted). The curve starts and ends where the hair
// meets the head perimeter at ±halfAngle.
function traceFringe(
  c2d: CanvasRenderingContext2D,
  r: number,
  shape: 'convex' | 'concave' | 'parted',
): void {
  const params = HAIRLINE_PARAMS[shape];
  const theta = params.halfAngle;
  const ix = r * Math.cos(theta);
  const iy = r * Math.sin(theta);
  c2d.moveTo(ix, iy);
  c2d.arc(0, 0, r, theta, Math.PI * 2 - theta);
  if (shape === 'parted') {
    const partX = ix - r * HAIRLINE_PARAMS.parted.partInset;
    c2d.quadraticCurveTo(r * params.apex, -iy * 0.55, partX, 0);
    c2d.quadraticCurveTo(r * params.apex, iy * 0.55, ix, iy);
  } else {
    c2d.quadraticCurveTo(r * params.apex, 0, ix, iy);
  }
  c2d.closePath();
}

// Horseshoe of hair: an outer arc along the back and sides, plus an inner
// ellipse cutting out the bald crown. The front transitions are quadratic
// curves whose control points sit on the inner ellipse's tangent at each
// intersection, so the join is rounded at the inner end and sharp at the outer.
function traceHorseshoe(c2d: CanvasRenderingContext2D, r: number): void {
  const { outerHalfAngle, innerHalfAngle, innerR, innerStretch, taper } = HAIRLINE_PARAMS.balding;
  const ry = innerR * r;
  const rx = ry * innerStretch;
  const cosB = Math.cos(innerHalfAngle);
  const sinB = Math.sin(innerHalfAngle);
  const ouX = r * Math.cos(outerHalfAngle);
  const ouY = r * Math.sin(outerHalfAngle);
  const iuX = rx * cosB;
  const iuY = ry * sinB;

  // λ scales the (rx·sinβ, ry·cosβ) tangent so the bezier control point sits
  // r·taper away along the tangent direction, independent of stretch.
  const tangentMag = Math.hypot(rx * sinB, ry * cosB);
  const lambda = (r * taper) / tangentMag;
  const cpLowerX = iuX + lambda * rx * sinB;
  const cpLowerY = -iuY + lambda * ry * cosB;
  const cpUpperX = iuX + lambda * rx * sinB;
  const cpUpperY = iuY - lambda * ry * cosB;

  c2d.moveTo(ouX, ouY);
  c2d.arc(0, 0, r, outerHalfAngle, Math.PI * 2 - outerHalfAngle);
  c2d.quadraticCurveTo(cpLowerX, cpLowerY, iuX, -iuY);
  c2d.ellipse(0, 0, rx, ry, 0, Math.PI * 2 - innerHalfAngle, innerHalfAngle, true);
  c2d.quadraticCurveTo(cpUpperX, cpUpperY, ouX, ouY);
  c2d.closePath();
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
