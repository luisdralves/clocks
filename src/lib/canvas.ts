import type { CanvasContext } from './types';

export function getCanvasDimensions(
  _canvas: HTMLCanvasElement,
): Omit<CanvasContext, 'canvas' | 'ctx'> {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth * dpr;
  const height = window.innerHeight * dpr;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;

  return { width, height, dpr, centerX, centerY, radius };
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasContext {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context');
  }

  const dimensions = getCanvasDimensions(canvas);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  return { canvas, ctx, ...dimensions };
}

export function createResizeHandler(
  canvas: HTMLCanvasElement,
  onResize?: (context: CanvasContext) => void,
): () => void {
  const handler = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dimensions = getCanvasDimensions(canvas);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    if (onResize) {
      onResize({ canvas, ctx, ...dimensions });
    }
  };

  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
  };
}
