import { useEffect, useState } from 'react';
import styles from './floor.module.css';
import { getScale } from './scaling';

// Single 2:1 herringbone floor. The smallest axis-aligned square that tiles the
// pattern by translation alone is 4W × 4W, where W is the plank's short side.
// Some planks straddle the tile boundary; we draw those as full rectangles that
// run past the viewBox. SVG clips them, and the neighboring tiles (same content,
// shifted by one tile) supply the missing halves.

const PLANK_W_DESIGN = 18;
const PLANK_RATIO = 2;

interface Plank {
  x: number;
  y: number;
  orient: 'h' | 'v';
}

const PLANKS: ReadonlyArray<Plank> = [
  { x: 0, y: 0, orient: 'v' },
  { x: 1, y: 1, orient: 'h' },
  { x: 3, y: 1, orient: 'v' },
  { x: 1, y: -1, orient: 'v' }, // wraps bottom
  { x: 2, y: 0, orient: 'h' },
  { x: 0, y: 2, orient: 'h' },
  { x: -1, y: 3, orient: 'h' }, // wraps left
  { x: 2, y: 2, orient: 'v' },
  { x: 3, y: 3, orient: 'h' }, // wraps right
  { x: 1, y: 3, orient: 'v' }, // wraps top
];

const PLANK_COLOR = '#f0e8d8';
const GROUT_COLOR = '#dfd5c0';
const PATTERN_ROTATION_DEG = 45;

function useWindowScale(): number {
  const [scale, setScale] = useState(() => getScale(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setScale(getScale(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

export function Floor() {
  const scale = useWindowScale();
  const W = PLANK_W_DESIGN * scale;
  const L = W * PLANK_RATIO;
  const tile = 4 * W;
  const strokeWidth = Math.max(0.5, W * 0.04);

  function rect(plank: Plank): { x: number; y: number; w: number; h: number } {
    const x = plank.x * W;
    const y = plank.y * W;
    if (plank.orient === 'h') return { x, y, w: L, h: W };
    return { x, y, w: W, h: L };
  }

  return (
    <svg className={styles.floor} aria-hidden="true">
      <defs>
        {/* Coarse, darker noise: big blotchy tone variation, like uneven aging
         * in the wood. Alpha is full noise; opacity lives on the consuming
         * <rect> so it stays easy to tune. */}
        <filter id="crowd-floor-noise-coarse" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.12"
            numOctaves="2"
            seed="7"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.32
                    0 0 0 0 0.24
                    0 0 0 0 0.16
                    1 0 0 0 0"
          />
        </filter>

        {/* Fine, lighter noise: high-frequency grain on top, in warm whites. */}
        <filter id="crowd-floor-noise-fine" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.5"
            numOctaves="2"
            seed="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.99
                    0 0 0 0 0.98
                    0 0 0 0 0.94
                    1 0 0 0 0"
          />
        </filter>

        {/* Plank seams only, drawn last so the grout lines stay crisp over both
         * noise layers. */}
        <pattern
          id="crowd-floor-seams"
          patternUnits="userSpaceOnUse"
          width={tile}
          height={tile}
          viewBox={`0 0 ${tile} ${tile}`}
          patternTransform={`rotate(${PATTERN_ROTATION_DEG})`}
        >
          {PLANKS.map((plank) => {
            const r = rect(plank);
            return (
              <rect
                key={`${plank.x},${plank.y},${plank.orient}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill="none"
                stroke={GROUT_COLOR}
                strokeWidth={strokeWidth}
              />
            );
          })}
        </pattern>
      </defs>

      {/* Render order: flat colour → coarse noise → fine noise → seams. */}
      <rect width="100%" height="100%" fill={PLANK_COLOR} />
      <rect width="100%" height="100%" filter="url(#crowd-floor-noise-coarse)" opacity="0.1" />
      <rect width="100%" height="100%" filter="url(#crowd-floor-noise-fine)" opacity="0.2" />
      <rect width="100%" height="100%" fill="url(#crowd-floor-seams)" opacity="0.75" />
    </svg>
  );
}
