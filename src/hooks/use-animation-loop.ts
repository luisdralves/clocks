import { useEffect, useRef } from 'react';
import { createAnimationLoop } from '@/lib/animation';

export function useAnimationLoop(
  onFrame: (currentTime: number, deltaTime: number) => void,
  fps: number = 30,
): void {
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  useEffect(() => {
    const loop = createAnimationLoop({
      fps,
      onFrame: (time, delta) => callbackRef.current(time, delta),
    });

    loop.start();
    return loop.stop;
  }, [fps]);
}
