import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationLoop } from '@/hooks/use-animation-loop';
import { useCanvas } from '@/hooks/use-canvas';
import { clockRadius } from './attractors';
import { BASE_GAIT_FREQUENCY, DNA_MAX_SIZE, PERSON_RADIUS, WALK_SPEED_MAX } from './constants';
import styles from './crowd-clock.module.css';
import { CustomizePanel } from './customize-panel';
import { type Dna, dnaFromPerson, dnaToAttributes } from './dna';
import { Floor } from './floor';
import { useDnaHash } from './hooks/use-dna-hash';
import { drawPerson } from './render-person';
import { getPopulation, getScale } from './scaling';
import { createPerson, type Person, stepSimulation } from './simulation';

const SIM_FPS = 60;
const SIM_DT_CLAMP = 1 / 20;

export function CrowdClock() {
  const [canvasRef, ctx] = useCanvas();
  const [dna, setDna] = useDnaHash();
  const [hoveringPerson, setHoveringPerson] = useState(false);

  const peopleRef = useRef<Person[]>([]);
  const customizeGaitRef = useRef(0);

  // People are seeded once on mount, never re-seeded on resize. The sim copes:
  // scale-dependent forces recompute each frame from the current viewport, and
  // the wanderer bound force herds any off-screen people back in. Re-seeding
  // would throw away the in-flight state every resize, which feels worse than a
  // one-time count mismatch.
  useEffect(() => {
    if (!ctx) return;
    if (peopleRef.current.length === 0) {
      const { complyers, wanderers } = getPopulation(ctx.width, ctx.height);
      const scale = getScale(ctx.width, ctx.height);
      const seed: Person[] = [];
      for (let i = 0; i < complyers; i++) {
        seed.push(createPerson(ctx.width, ctx.height, 'complyer', scale));
      }
      for (let i = 0; i < wanderers; i++) {
        seed.push(createPerson(ctx.width, ctx.height, 'wanderer', scale));
      }
      peopleRef.current = seed;
    }
  }, [ctx]);

  const draw = useCallback(
    (_time: number, deltaMs: number) => {
      if (!ctx) return;
      if (dna) {
        renderCustomize(ctx.ctx, ctx.width, ctx.height, dna, deltaMs, customizeGaitRef);
        return;
      }
      const dt = Math.min(deltaMs / 1000, SIM_DT_CLAMP);
      const clockR = clockRadius(ctx.width, ctx.height);
      const scale = getScale(ctx.width, ctx.height);
      stepSimulation(peopleRef.current, dt, {
        width: ctx.width,
        height: ctx.height,
        centerX: ctx.centerX,
        centerY: ctx.centerY,
        clockR,
        scale,
      });
      renderCrowd(ctx.ctx, ctx.width, ctx.height, peopleRef.current, scale);
    },
    [ctx, dna],
  );

  useAnimationLoop(draw, SIM_FPS);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx || dna) return;

    function toCanvas(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (ctx!.width / rect.width),
        y: (clientY - rect.top) * (ctx!.height / rect.height),
      };
    }

    function findAt(x: number, y: number): Person | null {
      const scale = getScale(ctx!.width, ctx!.height);
      let closest: Person | null = null;
      let bestD2 = Infinity;
      for (const p of peopleRef.current) {
        const r = PERSON_RADIUS * scale * p.size;
        const dx = p.x - x;
        const dy = p.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r && d2 < bestD2) {
          bestD2 = d2;
          closest = p;
        }
      }
      return closest;
    }

    const onMove = (e: MouseEvent) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setHoveringPerson(!!findAt(x, y));
    };
    const onClick = (e: MouseEvent) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const p = findAt(x, y);
      if (p) setDna(dnaFromPerson(p));
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [canvasRef, ctx, dna, setDna]);

  return (
    <>
      <Floor />
      <canvas ref={canvasRef} className={styles.canvas} data-hover={hoveringPerson} />
      {dna && <CustomizePanel dna={dna} onChange={setDna} onExit={() => setDna(null)} />}
    </>
  );
}

function renderCrowd(
  c2d: CanvasRenderingContext2D,
  width: number,
  height: number,
  people: Person[],
  scale: number,
): void {
  c2d.clearRect(0, 0, width, height);
  for (const p of people) drawPerson(c2d, p, scale);
}

function renderCustomize(
  c2d: CanvasRenderingContext2D,
  width: number,
  height: number,
  dna: Dna,
  deltaMs: number,
  gaitRef: { current: number },
): void {
  c2d.clearRect(0, 0, width, height);

  gaitRef.current += BASE_GAIT_FREQUENCY * 2 * Math.PI * (deltaMs / 1000);
  const attributes = dnaToAttributes(dna);
  const baseRadius = Math.min(width * 0.18, height * 0.4);
  const displayScale = baseRadius / (PERSON_RADIUS * DNA_MAX_SIZE);

  const sample: Person = {
    x: width * 0.75,
    y: height * 0.5,
    vx: 0,
    vy: 0,
    // Pin smoothed velocity at the cap so gait and arm-swing render at full
    // amplitude, giving the sample a walking-in-place look.
    svx: WALK_SPEED_MAX,
    svy: 0,
    role: 'complyer',
    facing: 0,
    gaitPhase: gaitRef.current,
    size: attributes.size * displayScale,
    skinColor: attributes.skinColor,
    hairColor: attributes.hairColor,
    hairShape: attributes.hairShape,
  };
  drawPerson(c2d, sample, 1);
}
