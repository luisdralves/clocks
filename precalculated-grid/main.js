// Canvas and WebGL Context
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2');

if (!gl) {
  alert('WebGL not supported in your browser!');
  throw new Error('No WebGL support');
}

// Resize canvas to fullscreen
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  
  // Set the display size (CSS pixels)
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  
  // Set the actual size in memory (scaled up for high DPR)
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  
  // Set the WebGL viewport
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let baseInterpolationFactor = 0.2;
  
async function main() {
  const vsSource = await (await fetch('/precalculated-grid/vertex.glsl')).text();
  const fsSource = await (await fetch('/precalculated-grid/fragment.glsl')).text();

  // Compile Shader Function
  function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    // Add proper error handling
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      console.error(`Shader compilation error (${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}): ${error}`);
      alert(`Shader compilation error:\n${error}`);
      return null;
    }
    return shader;
  }

  // Create Shader Program
  const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);

  // Check if shaders compiled successfully
  if (!vertexShader || !fragmentShader) {
    throw new Error('Shader compilation failed');
  }

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(shaderProgram);
    console.error('Program linking error:', error);
    alert(`Shader program link error:\n${error}`);
    throw new Error('Program linking failed');
  }

  gl.useProgram(shaderProgram);

  // Fullscreen Quad Geometry
  const positions = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    -1.0,  1.0,
    1.0,  1.0
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Set Uniform Locations
  const uResolution = gl.getUniformLocation(shaderProgram, 'u_resolution');
  const uN = gl.getUniformLocation(shaderProgram, 'u_n');
  const uI = gl.getUniformLocation(shaderProgram, 'u_i');
  const uJ = gl.getUniformLocation(shaderProgram, 'u_j');
  const uZoom = gl.getUniformLocation(shaderProgram, 'u_zoom');

  // Initial Uniform Values
  let n = 486.0;
  let i = 243.0;
  let j = 243.0;
  let zoom = 0.5;
  let lastTime = performance.now();

  function timeToIndex(time) {
    return Number(
      `${String(time.getHours()).padStart(2, "0")}${String(time.getMinutes()).padStart(2, "0")}${String(time.getSeconds()).padStart(2, "0")}`,
    );
  }

  function indexToCoordinates(index) {
    return [index % n, Math.floor(index / n)];
  }

  function getZoom(distance) {
    return Math.min(0.999, Math.max(0.5, ((0.5 - 0.999) * distance) / n + 0.999));
  }

  function interpolate(previousValue, nextValue, interpolationFactor) {
    return interpolationFactor * previousValue + (1 - interpolationFactor) * nextValue;
  }

  function render(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Convert to seconds and apply a time-based interpolation factor
    const timeStep = deltaTime / 1000; // Convert ms to seconds
    const stableInterpolationFactor = baseInterpolationFactor ** timeStep; // This gives us consistent behavior regardless of frame rate
    
    const previousI = i;
    const previousJ = j;
    const previousZoom = zoom;
    const targetIndex = timeToIndex(new Date());
    const [targetI, targetJ] = indexToCoordinates(targetIndex);
    i = interpolate(previousI, targetI+0.5, stableInterpolationFactor);
    j = interpolate(previousJ, targetJ+0.5, stableInterpolationFactor);
    const distanceToTarget = Math.sqrt((i - targetI) ** 2 + (j - targetJ) ** 2);
    const distanceToPrevious = Math.sqrt((i - previousI) ** 2 + (j - previousJ) ** 2);
    zoom = interpolate(previousZoom, getZoom(8*Math.min(distanceToTarget, distanceToPrevious)), Math.sqrt(stableInterpolationFactor));

    if(distanceToTarget < 1 && zoom > 0.99) {
      baseInterpolationFactor = 0.01;
    }

    // WebGL rendering - use actual canvas dimensions for gl_FragCoord matching
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uN, n);
    gl.uniform1f(uI, i);
    gl.uniform1f(uJ, j);
    gl.uniform1f(uZoom, zoom);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    requestAnimationFrame(render);
  }
  render(performance.now());

  // Interactive Controls
  document.addEventListener('keydown', (e) => {
    const step = 0.1;
    switch (e.key) {
      case 'ArrowUp': j -= step; break;
      case 'ArrowDown': j += step; break;
      case 'ArrowLeft': i -= step; break;
      case 'ArrowRight': i += step; break;
      case '+': zoom = Math.min(zoom+0.001, 1); break;
      case '-': zoom = Math.max(zoom-0.001, 0); break;
      case '0': n = Math.max(n - 1, 1); break;  // Decrease grid size
      case '1': n += 1; break;                 // Increase grid size
    }
    console.log(`i: ${i.toFixed(1)}, j: ${j.toFixed(1)}, zoom: ${zoom.toFixed(2)}, n: ${n}`);
  });
}

main();