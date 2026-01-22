import type { AnimationConfig, AnimationLoop } from './types';

const DEFAULT_FPS = 30;

export function createAnimationLoop(config: AnimationConfig): AnimationLoop {
  const fps = config.fps ?? DEFAULT_FPS;
  const frameInterval = 1000 / fps;
  let lastFrameTime = 0;
  let animationId: number | null = null;

  function loop(currentTime: number) {
    const deltaTime = currentTime - lastFrameTime;

    if (deltaTime >= frameInterval) {
      config.onFrame(currentTime, deltaTime);
      lastFrameTime = currentTime;
    }

    animationId = requestAnimationFrame(loop);
  }

  return {
    start: () => {
      if (animationId === null) {
        animationId = requestAnimationFrame(loop);
      }
    },
    stop: () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
  };
}
