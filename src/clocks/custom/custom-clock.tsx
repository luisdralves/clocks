import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationLoop } from '@/hooks/use-animation-loop';
import { useCanvas } from '@/hooks/use-canvas';
import { drawCircle } from '@/lib/drawing';
import { createSpring, updateSpring } from '@/lib/spring';
import { getDayFraction, valueToAngle } from '@/lib/time';
import type { SpringState } from '@/lib/types';
import { ConfigPanel } from './config-panel';
import styles from './custom-clock.module.css';
import { useUrlState } from './hooks/use-url-state';
import { getHandColor, getHandLength, getHandWidth, shouldUseSpring } from './presets';
import { formatNumber } from './roman';
import { drawDigitalClock } from './seven-segment';

function getHandValue(
  dayFraction: number,
  handIndex: number,
  hands: number[],
  cyclesPerDay: number,
): number {
  let product = cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= Math.abs(hands[i]);
  }
  const totalUnits = dayFraction * product;
  return totalUnits % Math.abs(hands[handIndex]);
}

export function CustomClock() {
  const [canvasRef, ctx] = useCanvas();
  const [config, setConfig] = useUrlState();
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const springStatesRef = useRef<SpringState[]>([]);

  useEffect(() => {
    const now = new Date();
    const dayFraction = getDayFraction(now);

    springStatesRef.current = config.hands.map((_, index) => {
      const value = getHandValue(dayFraction, index, config.hands, config.cyclesPerDay);
      return createSpring(value);
    });
  }, [config.hands, config.cyclesPerDay]);

  const draw = useCallback(() => {
    if (!ctx) return;

    const { ctx: context, width, height, centerX, centerY, radius } = ctx;

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    if (config.hands.length === 0) return;

    drawCircle(context, centerX, centerY, radius, 'white');

    context.strokeStyle = 'black';
    for (let handIndex = config.hands.length - 1; handIndex >= 0; handIndex--) {
      const units = Math.abs(config.hands[handIndex]);
      const t =
        config.hands.length > 1
          ? (config.hands.length - 1 - handIndex) / (config.hands.length - 1)
          : 1;
      const innerRadius = radius * (0.95 - t * 0.07);
      const lineWidth = radius * (0.004 + t * 0.012);

      context.lineWidth = lineWidth;
      for (let i = 0; i < units; i++) {
        const angle = (i / units) * Math.PI * 2 - Math.PI / 2;
        context.beginPath();
        context.moveTo(
          centerX + Math.cos(angle) * innerRadius,
          centerY + Math.sin(angle) * innerRadius,
        );
        context.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        context.stroke();
      }
    }

    const numberCount = Math.abs(config.hands[0]);
    const numberDirection = config.hands[0] >= 0 ? 1 : -1;
    if (config.numberStyle !== 'none') {
      context.fillStyle = 'black';
      const fontFamily = config.numberStyle === 'roman' ? 'serif' : 'sans-serif';
      context.font = `bold ${radius * 0.1}px ${fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      for (let i = 0; i < numberCount; i++) {
        const angle = numberDirection * (i / numberCount) * Math.PI * 2 - Math.PI / 2;
        const textRadius = radius * 0.8;
        const displayNum = i === 0 && config.numberStyle === 'roman' ? numberCount : i;
        const text = formatNumber(displayNum || numberCount, config.numberStyle);
        context.fillText(
          text,
          centerX + Math.cos(angle) * textRadius,
          centerY + Math.sin(angle) * textRadius,
        );
      }
    }

    const now = new Date();
    const dayFraction = getDayFraction(now);

    while (springStatesRef.current.length < config.hands.length) {
      const index = springStatesRef.current.length;
      const value = getHandValue(dayFraction, index, config.hands, config.cyclesPerDay);
      springStatesRef.current.push(createSpring(value));
    }
    springStatesRef.current.length = config.hands.length;

    const total = config.hands.length;
    for (let i = 0; i < total; i++) {
      const units = config.hands[i];
      const absUnits = Math.abs(units);
      const direction = units >= 0 ? 1 : -1;
      const rawValue = getHandValue(dayFraction, i, config.hands, config.cyclesPerDay);
      const useSpring = shouldUseSpring(i, config.hands, config.cyclesPerDay);
      let displayValue: number;

      if (useSpring) {
        const currentUnit = Math.floor(rawValue);
        springStatesRef.current[i] = updateSpring(
          springStatesRef.current[i],
          currentUnit,
          absUnits,
        );
        displayValue = springStatesRef.current[i].position;
      } else {
        displayValue = rawValue;
      }

      const angle = direction * valueToAngle(displayValue, absUnits, 0) - Math.PI / 2;

      context.beginPath();
      context.strokeStyle = getHandColor(i, total);
      context.lineWidth = radius * getHandWidth(i, total);
      context.lineCap = 'round';
      context.moveTo(centerX, centerY);
      context.lineTo(
        centerX + Math.cos(angle) * radius * getHandLength(i, total),
        centerY + Math.sin(angle) * radius * getHandLength(i, total),
      );
      context.stroke();
    }

    context.beginPath();
    context.fillStyle = 'black';
    context.arc(centerX, centerY, radius * 0.04, 0, Math.PI * 2);
    context.fill();

    const digitSize = radius * 0.12;
    const digitalY = centerY + radius + digitSize * 1.5;
    drawDigitalClock({
      ctx: context,
      centerX,
      bottomY: digitalY,
      dayFraction,
      digitSize,
      hands: config.hands,
      cyclesPerDay: config.cyclesPerDay,
    });
  }, [ctx, config]);

  useAnimationLoop(draw, 30);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <ConfigPanel config={config} onChange={setConfig} isOpen={isPanelOpen} />
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={styles.toggleButton}
        data-panel-open={isPanelOpen}
        type="button"
      >
        {isPanelOpen ? '✕' : '☰'}
      </button>
    </>
  );
}
