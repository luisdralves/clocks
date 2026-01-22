import { useCallback, useMemo, useRef } from 'react';
import { createSpring, DEFAULT_SPRING_CONFIG, updateSpring } from '@/lib/spring';
import type { SpringConfig, SpringState } from '@/lib/types';

export function useSpring(
  initialPosition: number,
  wrapAt: number,
  config: Partial<SpringConfig> = {},
): [() => number, (target: number) => void] {
  const stateRef = useRef<SpringState>(createSpring(initialPosition));
  const fullConfig = useMemo(() => ({ ...DEFAULT_SPRING_CONFIG, ...config }), [config]);

  const getPosition = useCallback(() => stateRef.current.position, []);

  const update = useCallback(
    (targetUnit: number) => {
      stateRef.current = updateSpring(stateRef.current, targetUnit, wrapAt, fullConfig);
    },
    [wrapAt, fullConfig],
  );

  return [getPosition, update];
}
