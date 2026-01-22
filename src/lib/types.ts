export interface SpringState {
  position: number;
  velocity: number;
  lastUnit: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  acceleration: number;
}

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  centerX: number;
  centerY: number;
  radius: number;
}

export interface HandStyle {
  length: number;
  width: number;
  color: string;
  lineCap?: CanvasLineCap;
}

export interface AnimationLoop {
  start: () => void;
  stop: () => void;
}

export interface AnimationConfig {
  fps?: number;
  onFrame: (currentTime: number, deltaTime: number) => void;
}

export interface TimeComponents {
  hours: number;
  hours12: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  dayFraction: number;
}
