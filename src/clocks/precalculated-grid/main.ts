import fragmentSource from './shaders/fragment.glsl?raw';
import vertexSource from './shaders/vertex.glsl?raw';

const canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2')!;

if (!gl) {
  throw new Error('WebGL2 not supported');
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let baseInterpolationFactor = 0.2;

function compileShader(source: string, type: number): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    throw new Error(`Shader compilation error: ${error}`);
  }

  return shader;
}

const vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

const shaderProgram = gl.createProgram();
if (!shaderProgram) throw new Error('Could not create shader program');

gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  const error = gl.getProgramInfoLog(shaderProgram);
  throw new Error(`Program linking error: ${error}`);
}

gl.useProgram(shaderProgram);

const positions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

const uResolution = gl.getUniformLocation(shaderProgram, 'u_resolution');
const uN = gl.getUniformLocation(shaderProgram, 'u_n');
const uI = gl.getUniformLocation(shaderProgram, 'u_i');
const uJ = gl.getUniformLocation(shaderProgram, 'u_j');
const uZoom = gl.getUniformLocation(shaderProgram, 'u_zoom');

const n = 486.0;
let i = 243.0;
let j = 243.0;
let zoom = 0.5;
let lastTime = performance.now();

function timeToIndex(time: Date): number {
  return Number(
    `${String(time.getHours()).padStart(2, '0')}${String(time.getMinutes()).padStart(2, '0')}${String(time.getSeconds()).padStart(2, '0')}`,
  );
}

function indexToCoordinates(index: number): [number, number] {
  return [index % n, Math.floor(index / n)];
}

function getZoom(distance: number): number {
  return Math.min(0.999, Math.max(0.5, ((0.5 - 0.999) * distance) / n + 0.999));
}

function interpolate(
  previousValue: number,
  nextValue: number,
  interpolationFactor: number,
): number {
  return interpolationFactor * previousValue + (1 - interpolationFactor) * nextValue;
}

function render(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  const timeStep = deltaTime / 1000;
  const stableInterpolationFactor = baseInterpolationFactor ** timeStep;

  const previousI = i;
  const previousJ = j;
  const previousZoom = zoom;
  const targetIndex = timeToIndex(new Date());
  const [targetI, targetJ] = indexToCoordinates(targetIndex);

  i = interpolate(previousI, targetI + 0.5, stableInterpolationFactor);
  j = interpolate(previousJ, targetJ + 0.5, stableInterpolationFactor);

  const distanceToTarget = Math.sqrt((i - targetI) ** 2 + (j - targetJ) ** 2);
  const distanceToPrevious = Math.sqrt((i - previousI) ** 2 + (j - previousJ) ** 2);

  zoom = interpolate(
    previousZoom,
    getZoom(8 * Math.min(distanceToTarget, distanceToPrevious)),
    Math.sqrt(stableInterpolationFactor),
  );

  if (distanceToTarget < 1 && zoom > 0.99) {
    baseInterpolationFactor = 0.01;
  }

  gl.uniform2f(uResolution, canvas.width, canvas.height);
  gl.uniform1f(uN, n);
  gl.uniform1f(uI, i);
  gl.uniform1f(uJ, j);
  gl.uniform1f(uZoom, zoom);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(render);
}

render(performance.now());

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const step = 0.1;
  switch (e.key) {
    case 'ArrowUp':
      j -= step;
      break;
    case 'ArrowDown':
      j += step;
      break;
    case 'ArrowLeft':
      i -= step;
      break;
    case 'ArrowRight':
      i += step;
      break;
    case '+':
      zoom = Math.min(zoom + 0.001, 1);
      break;
    case '-':
      zoom = Math.max(zoom - 0.001, 0);
      break;
  }
});
