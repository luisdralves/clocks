import { useCallback, useEffect, useRef, useState } from 'react';
import { createResizeHandler, setupCanvas } from '@/lib/canvas';
import type { CanvasContext } from '@/lib/types';

export function useCanvas(): [React.RefObject<HTMLCanvasElement>, CanvasContext | null] {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [context, setContext] = useState<CanvasContext | null>(null);

  const updateContext = useCallback((ctx: CanvasContext) => {
    setContext(ctx);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = setupCanvas(canvasRef.current);
    setContext(ctx);

    const cleanup = createResizeHandler(canvasRef.current, updateContext);
    return cleanup;
  }, [updateContext]);

  return [canvasRef, context];
}
