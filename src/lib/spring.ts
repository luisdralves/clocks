import type { SpringConfig, SpringState } from './types';

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  stiffness: 2,
  damping: 0.4,
  acceleration: 0.25,
};

export function createSpring(initialPosition: number): SpringState {
  return {
    position: initialPosition,
    velocity: 0,
    lastUnit: Math.floor(initialPosition),
  };
}

export function updateSpring(
  state: SpringState,
  targetUnit: number,
  wrapAt: number,
  config: SpringConfig = DEFAULT_SPRING_CONFIG,
): SpringState {
  const newState = { ...state };

  if (state.lastUnit === wrapAt - 1 && targetUnit === 0) {
    newState.position -= wrapAt;
  }

  if (targetUnit !== state.lastUnit) {
    newState.velocity += config.acceleration;
    newState.lastUnit = targetUnit;
  }

  const displacement = targetUnit - newState.position;
  const springForce = displacement * config.stiffness;
  newState.velocity += springForce;
  newState.velocity *= config.damping;
  newState.position += newState.velocity;

  return newState;
}
