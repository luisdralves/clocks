// Tweakable knobs for the crowd simulation. Length/force/speed values are
// given at the design viewport size (DESIGN_MIN_DIM) and multiplied by
// getScale() at runtime so things look the same on any screen. Time-domain
// constants (rates, frequencies, damping) are scale-invariant.

export const DESIGN_MIN_DIM = 927; // canvas px; the size everything was tuned at
// Same on every viewport: the clock and people scale together, so the same
// count always fits.
export const DESIGN_COMPLYERS = 180;
// Wanderer count comes from the empty area around the clock divided by R²
// (person area scales with R² too). At the design viewport this gives 60.
export const DESIGN_WANDERER_DENSITY = 8.5;

export const ROLE_SWITCH_RATE = 0.01; // base swap rate per wanderer per second
// Wanderers near a viewport edge swap roles more often so they don't pile up
// in the corners; the total count doesn't change, only where turnover happens.
// The zone is per-axis: 0.5 means the outer half of the empty space between
// clock and edge counts as the bias zone.
export const EDGE_BIAS_ZONE_FRACTION = 0.5;
export const EDGE_BIAS_STRENGTH = 4; // multiplier on swap rate at the edge

// Clock geometry, fractions of clock radius unless noted.
export const CLOCK_RADIUS_FRACTION = 0.45; // of min(canvas width, height)
export const INDICATOR_INNER_FRACTION = 0.9;
export const INDICATOR_OUTER_FRACTION = 1.0;
export const HAND_INNER_FRACTION = 0.13; // hands stop short of the center
export const HAND_LENGTHS = {
  hour: 0.4,
  minute: 0.62,
} as const;
// Each hand is N parallel line attractors offset perpendicular to it. People
// pack onto each row, making a thick hand without the hollow interior a single
// wide strip would leave.
export const HAND_ROWS = 2;
export const HAND_ROW_SPACING = 10;

export const WALK_SPEED_MAX = 5.5;
export const VELOCITY_DAMPING = 10; // 1/sec; over-damped to kill oscillation
export const TEMPERATURE = 1.0; // jitter acceleration magnitude

// Attractor force, complyers only. Strongest at the attractor and decaying
// with distance, so the nearest one wins once a complyer reaches it. Falloff
// is per-attractor: indicators reach short, hands reach far so they win far-off
// complyers. That pulls people out of indicator orbits without shaking loose
// the ones already on the line.
export const ATTRACTOR_STRENGTH = 1800;
export const INDICATOR_FALLOFF_FRACTION = 0.09;
export const HAND_FALLOFF_FRACTION = 0.15; // much longer reach

export const REPULSION_STRENGTH = 22000;
export const REPULSION_RADIUS = 9;
// Weak, longer-range second term: a soft "pressure" between distant pairs that
// pushes people toward open space. Spreads complyers along attractor segments
// and keeps wanderers from clumping. Applies to every pair regardless of role.
export const REPULSION_FAR_STRENGTH = 1500;
export const REPULSION_FAR_RADIUS = 30;

// Hard positional separation for pairs that include a wanderer. Applied after
// velocity integration, so it bypasses the speed cap and gives the visible
// "shoving through the crowd" look.
export const WANDERER_MIN_DISTANCE = 16;
export const WANDERER_SEPARATION_RATE = 0.04; // fraction of overlap resolved per frame

// Wanderer behavior. Wanderers have no internal drive; they only react. Two
// forces move them: the viewport bound that keeps them on screen, and a
// long-range "crowd pressure" where every other person gives a soft-core
// inverse-square push. The pressure never cuts off, so a wanderer always feels
// which way is away from the crowd.
export const WANDERER_BOUND_PADDING = 20; // canvas px from the viewport edge
export const WANDERER_BOUND_STRENGTH = 12;
export const WANDERER_PRESSURE_STRENGTH = 200;
export const WANDERER_PRESSURE_SCALE = 30; // canvas px (the soft-core scale)

// Body proportions, multiples of head radius × size.
export const PERSON_RADIUS = 3.5; // canvas px head radius at size=1
export const PERSON_SIZE_VARIATION = 0.3; // ±15% around 1.0
export const LIMB_RADIUS_FACTOR = 0.45;
export const SHOULDER_OFFSET_FACTOR = 0.75;
export const ARM_SWING_FACTOR = 0.9; // max forward/back arm offset at full speed
export const STROKE_COLOR = '#000';
export const STROKE_FRACTION = 0.07;
export const STROKE_MIN_PX = 0.7;

// Hairline-curve tuning per shape. The curve meets the head perimeter at
// `halfAngle` from facing; `apex` is the quadratic control-point x as a
// multiple of r. `parted` has two humps meeting at the part, inset `partInset`
// behind the chord. `balding` is a horseshoe around the back and sides with an
// inner ellipse cutting out the bald crown; `innerStretch` elongates that
// ellipse front-to-back and `taper` sets how smoothly the front edge joins it.
export const HAIRLINE_PARAMS = {
  convex: { halfAngle: 1.15, apex: 0.88 },
  concave: { halfAngle: 1.05, apex: 0.3 },
  parted: { halfAngle: 1.0, apex: 0.72, partInset: 0.05 },
  balding: {
    outerHalfAngle: 1.0,
    innerHalfAngle: 1.45,
    innerR: 0.55,
    innerStretch: 1.15,
    taper: 0.4,
  },
} as const;

export const BASE_GAIT_FREQUENCY = 1.0; // cycles/sec at WALK_SPEED_MAX
export const FACING_SMOOTHING = 12; // higher = snappier turn to face velocity
export const FACING_SPEED_THRESHOLD = 0.8; // below this, facing is locked
export const ANIM_VELOCITY_SMOOTHING = 4; // 1/sec low-pass on velocity for anim
export const ANIM_MIN_SPEED = 1.2; // below this smoothed speed, amp = 0

export const DNA_SIZE_BUCKETS = 16;
export const DNA_MIN_SIZE = 1 - PERSON_SIZE_VARIATION / 2;
export const DNA_MAX_SIZE = 1 + PERSON_SIZE_VARIATION / 2;
