import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationLoop } from '@/hooks/use-animation-loop';
import { useCanvas } from '@/hooks/use-canvas';
import { drawCenterDot, drawCircle, drawHand, drawTickMarks } from '@/lib/drawing';
import { createSpring, updateSpring } from '@/lib/spring';
import type { SpringState } from '@/lib/types';
import styles from './daylight-clock.module.css';
import { useGeolocation } from './hooks/use-geolocation';
import { getSkyColor, isLightTime } from './sky-colors';
import { formatTemporalTime, getCurrentSecondLength, getSunTimes, getTemporalTime } from './solar';

function logDaylightInfo(date: Date, lat: number, lon: number): void {
  const { sunrise, sunset, isDayAllDay, isNightAllDay } = getSunTimes(date, lat, lon);

  console.group('Daylight Clock Info');
  console.log(
    `Location: ${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`,
  );
  console.log(`Date: ${date.toLocaleDateString()}`);
  console.log(
    `Timezone: UTC${date.getTimezoneOffset() <= 0 ? '+' : ''}${-date.getTimezoneOffset() / 60}`,
  );

  if (isDayAllDay) {
    console.log('Polar day: Sun never sets (midnight sun)');
  } else if (isNightAllDay) {
    console.log('Polar night: Sun never rises');
  } else {
    const dayLength = sunset - sunrise;
    console.log(`Sunrise: ${formatHours(sunrise)}`);
    console.log(`Sunset: ${formatHours(sunset)}`);
    console.log(`Day length: ${dayLength.toFixed(2)} hours`);
  }
  console.groupEnd();
}

function formatHours(decimalHours: number): string {
  let h = decimalHours;
  while (h < 0) h += 24;
  while (h >= 24) h -= 24;

  const hours = Math.floor(h);
  const minutes = Math.floor((h - hours) * 60);
  const seconds = Math.floor(((h - hours) * 60 - minutes) * 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function DaylightClock() {
  const [canvasRef, ctx] = useCanvas();
  const location = useGeolocation();
  const [temporalTimeStr, setTemporalTimeStr] = useState('--:--:--');
  const [secondLength, setSecondLength] = useState('--');
  const [isLight, setIsLight] = useState(true);

  const springRef = useRef<SpringState | null>(null);
  const lastTemporalSecondRef = useRef<number>(0);
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (location.ready && !hasLoggedRef.current) {
      logDaylightInfo(new Date(), location.latitude, location.longitude);
      hasLoggedRef.current = true;
    }
  }, [location]);

  const draw = useCallback(() => {
    if (!ctx || !location.ready) return;

    const { ctx: context, width, height, centerX, centerY, radius } = ctx;
    const now = new Date();

    const temporalSeconds = getTemporalTime(now, location.latitude, location.longitude);

    if (springRef.current === null) {
      const initialSecond = Math.floor(temporalSeconds) % 60;
      springRef.current = createSpring(initialSecond);
      lastTemporalSecondRef.current = initialSecond;
    }

    const skyColor = getSkyColor(temporalSeconds);
    context.fillStyle = skyColor;
    context.fillRect(0, 0, width, height);

    const isLightNow = isLightTime(temporalSeconds);
    const faceColor = isLightNow ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 30, 40, 0.9)';
    const handColor = isLightNow ? 'black' : 'white';
    const tickColor = isLightNow ? 'black' : 'white';

    drawCircle(context, centerX, centerY, radius, faceColor);

    drawTickMarks(context, centerX, centerY, radius, 60, {
      innerRadiusFraction: 0.95,
      lineWidth: radius * 0.005,
      color: tickColor,
      majorInterval: 5,
      majorInnerRadiusFraction: 0.9,
      majorLineWidth: radius * 0.015,
    });

    const temporalTotalSeconds = Math.floor(temporalSeconds);
    const temporalSecond = temporalTotalSeconds % 60;

    const smoothMinutes = (temporalSeconds / 60) % 60;
    const smoothHours = (temporalSeconds / 3600) % 12;

    if (temporalSecond !== lastTemporalSecondRef.current) {
      springRef.current = updateSpring(springRef.current!, temporalSecond, 60);
      lastTemporalSecondRef.current = temporalSecond;
    } else {
      springRef.current = updateSpring(springRef.current!, temporalSecond, 60);
    }

    const secondAngle = (springRef.current!.position / 60) * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = (smoothMinutes / 60) * Math.PI * 2 - Math.PI / 2;
    const hourAngle = (smoothHours / 12) * Math.PI * 2 - Math.PI / 2;

    drawHand(
      context,
      centerX,
      centerY,
      hourAngle,
      { length: 0.5, width: 0.06, color: handColor },
      radius,
    );

    drawHand(
      context,
      centerX,
      centerY,
      minuteAngle,
      { length: 0.7, width: 0.04, color: handColor },
      radius,
    );

    drawHand(
      context,
      centerX,
      centerY,
      secondAngle,
      { length: 0.8, width: 0.02, color: '#e74c3c' },
      radius,
    );

    drawCenterDot(context, centerX, centerY, radius * 0.04, handColor);

    const currentSecondLength = getCurrentSecondLength(now, location.latitude, location.longitude);
    setTemporalTimeStr(formatTemporalTime(temporalSeconds));
    setSecondLength(currentSecondLength.toFixed(5));
    setIsLight(isLightNow);
  }, [ctx, location]);

  useAnimationLoop(draw, 30);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.info} data-light={isLight}>
        <div className={styles.poem}>
          A clock that tells time a new way
          <br />
          12 hours of light every day
          <br />
          <span className={styles.indented}>At 6 comes the dawn</span>
          <br />
          <span className={styles.indented}>18, light is gone</span>
          <br />
          The seconds will stretch and will sway!
        </div>
        <div className={styles.details}>
          Current time would be <span id="temporal-time">{temporalTimeStr}</span>
          <br />
          Each second would last <span id="second-length">{secondLength}</span> real seconds
        </div>
      </div>
    </>
  );
}
