const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

// === Presets ===
// Hands are ordered slowest to fastest (we divide the day, then subdivide, etc.)
// Each hand is just its units count; visuals are calculated from index
const PRESETS = {
  regular12: {
    hands: [12, 60, 60],
    numberStyle: "arabic",
    cyclesPerDay: 2,
  },
  regular24: {
    hands: [24, 60, 60],
    numberStyle: "arabic",
    cyclesPerDay: 1,
  },
  decimal: {
    hands: [10, 10, 10],
    numberStyle: "arabic",
    cyclesPerDay: 1,
  },
  hexadecimal: {
    hands: [16, 16, 16, 16],
    numberStyle: "arabic",
    cyclesPerDay: 1,
  },
  binary: {
    hands: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    numberStyle: "none",
    cyclesPerDay: 1,
  },
};

// Calculate hand visuals from index
function getHandLength(index, total) {
  // 0.85 * (n + 2t)² / (3t - 1)² - fastest is always 85%
  const n = index;
  const t = total;
  return 0.85 * Math.pow(n + 2 * t, 2) / Math.pow(3 * t - 1, 2);
}

function getHandWidth(index, total) {
  // Linear: 0.02 for fastest, 0.06 for slowest
  if (total <= 1) return 0.04;
  return 0.02 + 0.04 * (total - 1 - index) / (total - 1);
}

function getHandColor(index, total) {
  return index === total - 1 ? "#ff0000" : "#000000";
}

function getHandSpring(index) {
  // Apply spring physics to hands in the "goldilocks" zone: 250ms to 10s per tick
  const secondsPerTick = getSecondsPerTick(index);
  return secondsPerTick >= 0.25 && secondsPerTick <= 10;
}

function getSecondsPerTick(handIndex) {
  // Calculate how many seconds one tick of this hand represents
  const SECONDS_PER_DAY = 86400;
  let product = config.cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= config.hands[i];
  }
  return SECONDS_PER_DAY / product;
}

function formatDuration(seconds) {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    if (Number.isInteger(hours)) return `${hours}h`;
    return `${hours.toFixed(2)}h`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    if (Number.isInteger(minutes)) return `${minutes}m`;
    return `${minutes.toFixed(2)}m`;
  }
  if (Number.isInteger(seconds)) return `${seconds}s`;
  if (seconds >= 1) return `${seconds.toFixed(2)}s`;
  return `${(seconds * 1000).toFixed(0)}ms`;
}

// === State ===
let config = {
  hands: [],
  numberStyle: "arabic",
  cyclesPerDay: 1,
};

let springStates = []; // { position, velocity, lastUnit }[]

const SPRING_STIFFNESS = 2;
const SPRING_DAMPING = 0.4;
const SPRING_ACCELERATION = 0.25;

// === Canvas Setup ===
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// === URL State ===
function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  const handsParam = params.get("h");
  const numberStyle = params.get("n") || "arabic";
  const cyclesPerDay = parseInt(params.get("c"), 10) || 1;

  if (!handsParam) return null;

  try {
    const hands = handsParam.split(",").map((u) => parseInt(u, 10));
    if (hands.some(isNaN)) return null;
    return { hands, numberStyle, cyclesPerDay };
  } catch {
    return null;
  }
}

function updateUrl() {
  const params = new URLSearchParams();
  params.set("h", config.hands.join(","));
  params.set("n", config.numberStyle);
  if (config.cyclesPerDay !== 1) {
    params.set("c", config.cyclesPerDay);
  }
  history.replaceState(null, "", `?${params.toString()}`);
}

// === UI ===
const presetSelect = document.getElementById("preset-select");
const numberStyleSelect = document.getElementById("number-style");
const cyclesPerDayInput = document.getElementById("cycles-per-day");
const handsContainer = document.getElementById("hands-container");
const addHandBtn = document.getElementById("add-hand-btn");
const toggleBtn = document.getElementById("toggle-btn");
const configPanel = document.getElementById("config-panel");

function updateExchangeRates() {
  handsContainer.querySelectorAll(".exchange-rate").forEach((el, index) => {
    const secondsPerTick = getSecondsPerTick(index);
    el.textContent = `= ${formatDuration(secondsPerTick)}/tick`;
  });
}

function renderHandsUI() {
  handsContainer.innerHTML = "";
  config.hands.forEach((units, index) => {
    const card = document.createElement("div");
    card.className = "hand-card";

    const label =
      index === 0
        ? "Hand 1 (slowest)"
        : index === config.hands.length - 1
          ? `Hand ${index + 1} (fastest)`
          : `Hand ${index + 1}`;

    const secondsPerTick = getSecondsPerTick(index);
    const duration = formatDuration(secondsPerTick);

    card.innerHTML = `
      <div class="hand-header">
        <span>${label}</span>
        ${config.hands.length > 1 ? `<button class="remove-btn" data-index="${index}">Remove</button>` : ""}
      </div>
      <div class="row">
        <label>Units</label>
        <input type="number" min="2" max="100" value="${units}" data-index="${index}">
        <span class="exchange-rate">= ${duration}/tick</span>
      </div>
    `;

    handsContainer.appendChild(card);
  });

  // Attach event listeners
  handsContainer.querySelectorAll("input, button").forEach((el) => {
    if (el.classList.contains("remove-btn")) {
      el.addEventListener("click", () => {
        const index = parseInt(el.dataset.index, 10);
        config.hands.splice(index, 1);
        springStates.splice(index, 1);
        presetSelect.value = "custom";
        renderHandsUI();
        updateUrl();
      });
    } else if (el.type === "number") {
      el.addEventListener("input", (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        config.hands[index] = parseInt(e.target.value, 10) || 2;
        presetSelect.value = "custom";
        initSpringStates();
        updateExchangeRates();
        updateUrl();
      });
    }
  });
}

function detectPreset() {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (
      preset.hands.length === config.hands.length &&
      preset.numberStyle === config.numberStyle &&
      preset.cyclesPerDay === config.cyclesPerDay &&
      preset.hands.every((units, i) => units === config.hands[i])
    ) {
      return name;
    }
  }
  return "custom";
}

presetSelect.addEventListener("change", (e) => {
  const preset = PRESETS[e.target.value];
  if (preset) {
    config.hands = [...preset.hands];
    config.numberStyle = preset.numberStyle;
    config.cyclesPerDay = preset.cyclesPerDay;
    numberStyleSelect.value = config.numberStyle;
    cyclesPerDayInput.value = config.cyclesPerDay;
    initSpringStates();
    renderHandsUI();
    updateUrl();
  }
});

numberStyleSelect.addEventListener("change", (e) => {
  config.numberStyle = e.target.value;
  presetSelect.value = detectPreset();
  updateUrl();
});

cyclesPerDayInput.addEventListener("input", (e) => {
  config.cyclesPerDay = parseInt(e.target.value, 10) || 1;
  presetSelect.value = detectPreset();
  initSpringStates();
  updateExchangeRates();
  updateUrl();
});

addHandBtn.addEventListener("click", () => {
  config.hands.push(10);
  initSpringStates();
  presetSelect.value = "custom";
  renderHandsUI();
  updateUrl();
});

toggleBtn.addEventListener("click", () => {
  configPanel.classList.toggle("collapsed");
  toggleBtn.textContent = configPanel.classList.contains("collapsed")
    ? "☰"
    : "✕";
});

// === Spring Physics ===
function initSpringStates() {
  const now = new Date();
  const dayFraction = getDayFraction(now);

  springStates = config.hands.map((hand, index) => {
    const value = getHandValue(dayFraction, index);
    return {
      position: value,
      velocity: 0,
      lastUnit: Math.floor(value),
    };
  });
}

// === Time Calculation ===
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDayFraction(date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return (date.getTime() - midnight.getTime()) / MS_PER_DAY;
}

function getHandValue(dayFraction, handIndex) {
  // Product of units from slowest (index 0) up to this hand, times cyclesPerDay
  // Slower hands (lower index) have smaller product = fewer ticks per day
  let product = config.cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= config.hands[i];
  }
  const totalUnits = dayFraction * product;
  return totalUnits % config.hands[handIndex];
}

// === Number Formatting ===
const ROMAN_NUMERALS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
  "XXII",
  "XXIII",
  "XXIV",
];

function formatNumber(n, style) {
  if (style === "none") return "";
  if (style === "roman") {
    return ROMAN_NUMERALS[n] || n.toString();
  }
  return n.toString();
}

// 7-segment display: segments labeled a-g
//   aaa
//  f   b
//   ggg
//  e   c
//   ddd
const SEVEN_SEG_PATTERNS = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
};

function drawSevenSegDigit(ctx, x, y, digit, size, color) {
  const pattern = SEVEN_SEG_PATTERNS[digit] || SEVEN_SEG_PATTERNS[0];
  const w = size * 0.6; // width of digit
  const h = size; // height of digit
  const t = size * 0.12; // segment thickness
  const gap = t * 0.3; // gap between segments

  ctx.fillStyle = color;

  // Segment a (top horizontal)
  if (pattern[0]) {
    ctx.beginPath();
    ctx.moveTo(x + gap + t, y);
    ctx.lineTo(x + w - gap - t, y);
    ctx.lineTo(x + w - gap, y + t / 2);
    ctx.lineTo(x + w - gap - t, y + t);
    ctx.lineTo(x + gap + t, y + t);
    ctx.lineTo(x + gap, y + t / 2);
    ctx.fill();
  }

  // Segment b (top right vertical)
  if (pattern[1]) {
    ctx.beginPath();
    ctx.moveTo(x + w, y + gap + t);
    ctx.lineTo(x + w, y + h / 2 - gap);
    ctx.lineTo(x + w - t / 2, y + h / 2);
    ctx.lineTo(x + w - t, y + h / 2 - gap);
    ctx.lineTo(x + w - t, y + gap + t);
    ctx.lineTo(x + w - t / 2, y + gap);
    ctx.fill();
  }

  // Segment c (bottom right vertical)
  if (pattern[2]) {
    ctx.beginPath();
    ctx.moveTo(x + w - t / 2, y + h / 2);
    ctx.lineTo(x + w, y + h / 2 + gap);
    ctx.lineTo(x + w, y + h - gap - t);
    ctx.lineTo(x + w - t / 2, y + h - gap);
    ctx.lineTo(x + w - t, y + h - gap - t);
    ctx.lineTo(x + w - t, y + h / 2 + gap);
    ctx.fill();
  }

  // Segment d (bottom horizontal)
  if (pattern[3]) {
    ctx.beginPath();
    ctx.moveTo(x + gap, y + h - t / 2);
    ctx.lineTo(x + gap + t, y + h - t);
    ctx.lineTo(x + w - gap - t, y + h - t);
    ctx.lineTo(x + w - gap, y + h - t / 2);
    ctx.lineTo(x + w - gap - t, y + h);
    ctx.lineTo(x + gap + t, y + h);
    ctx.fill();
  }

  // Segment e (bottom left vertical)
  if (pattern[4]) {
    ctx.beginPath();
    ctx.moveTo(x + t / 2, y + h / 2);
    ctx.lineTo(x + t, y + h / 2 + gap);
    ctx.lineTo(x + t, y + h - gap - t);
    ctx.lineTo(x + t / 2, y + h - gap);
    ctx.lineTo(x, y + h - gap - t);
    ctx.lineTo(x, y + h / 2 + gap);
    ctx.fill();
  }

  // Segment f (top left vertical)
  if (pattern[5]) {
    ctx.beginPath();
    ctx.moveTo(x + t / 2, y + gap);
    ctx.lineTo(x + t, y + gap + t);
    ctx.lineTo(x + t, y + h / 2 - gap);
    ctx.lineTo(x + t / 2, y + h / 2);
    ctx.lineTo(x, y + h / 2 - gap);
    ctx.lineTo(x, y + gap + t);
    ctx.fill();
  }

  // Segment g (middle horizontal)
  if (pattern[6]) {
    ctx.beginPath();
    ctx.moveTo(x + gap, y + h / 2);
    ctx.lineTo(x + gap + t, y + h / 2 - t / 2);
    ctx.lineTo(x + w - gap - t, y + h / 2 - t / 2);
    ctx.lineTo(x + w - gap, y + h / 2);
    ctx.lineTo(x + w - gap - t, y + h / 2 + t / 2);
    ctx.lineTo(x + gap + t, y + h / 2 + t / 2);
    ctx.fill();
  }

  return w; // return width for positioning next digit
}

function drawColon(ctx, x, y, size, color) {
  const dotSize = size * 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + dotSize, y + size * 0.3, dotSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + dotSize, y + size * 0.7, dotSize, 0, Math.PI * 2);
  ctx.fill();
  return dotSize * 2.5; // return width
}

function getDigitalValue(dayFraction, handIndex) {
  // Like getHandValue, but for the slowest hand, show full day range
  let product = config.cyclesPerDay;
  for (let i = 0; i <= handIndex; i++) {
    product *= config.hands[i];
  }
  const totalUnits = dayFraction * product;

  // For the slowest hand with multiple cycles, show full range (e.g., 0-23 not 0-11)
  if (handIndex === 0 && config.cyclesPerDay > 1) {
    return totalUnits % (config.hands[handIndex] * config.cyclesPerDay);
  }
  return totalUnits % config.hands[handIndex];
}

function getDigitalMaxUnits(handIndex) {
  // Get the max value for digit padding
  if (handIndex === 0 && config.cyclesPerDay > 1) {
    return config.hands[handIndex] * config.cyclesPerDay;
  }
  return config.hands[handIndex];
}

function drawDigitalClock(ctx, centerX, bottomY, dayFraction, digitSize) {
  if (config.hands.length === 0) return;

  const color = "#00cc00";
  const digitWidth = digitSize * 0.6;
  const colonWidth = digitSize * 0.3;
  const spacing = digitSize * 0.15;

  // Calculate total width
  let totalWidth = 0;
  for (let i = 0; i < config.hands.length; i++) {
    const maxUnits = getDigitalMaxUnits(i);
    const digitCount = maxUnits.toString().length;
    totalWidth += digitCount * (digitWidth + spacing);
    if (i < config.hands.length - 1) {
      totalWidth += colonWidth + spacing;
    }
  }

  let x = centerX - totalWidth / 2;
  const y = bottomY - digitSize;

  for (let i = 0; i < config.hands.length; i++) {
    const value = Math.floor(getDigitalValue(dayFraction, i));
    const maxUnits = getDigitalMaxUnits(i);
    const digitCount = maxUnits.toString().length;
    const valueStr = value.toString().padStart(digitCount, "0");

    for (const char of valueStr) {
      drawSevenSegDigit(ctx, x, y, parseInt(char, 10), digitSize, color);
      x += digitWidth + spacing;
    }

    if (i < config.hands.length - 1) {
      drawColon(ctx, x, y, digitSize, color);
      x += colonWidth + spacing;
    }
  }
}

// === Drawing ===
const frameInterval = 1000 / 30;
let lastFrameTime = 0;

function draw(currentTime) {
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(draw);
    return;
  }
  lastFrameTime = currentTime;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (config.hands.length === 0) {
    requestAnimationFrame(draw);
    return;
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.4;

  // Clock face
  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw tick marks: fastest first (smallest ticks), slowest last (largest, on top)
  ctx.strokeStyle = "black";
  for (let handIndex = config.hands.length - 1; handIndex >= 0; handIndex--) {
    const units = config.hands[handIndex];
    // t=0 for fastest (smallest ticks), t=1 for slowest (largest ticks)
    const t =
      config.hands.length > 1
        ? (config.hands.length - 1 - handIndex) / (config.hands.length - 1)
        : 1;
    const innerRadius = radius * (0.95 - t * 0.07); // 0.95 for smallest, 0.88 for largest
    const lineWidth = radius * (0.004 + t * 0.012); // 0.004 for smallest, 0.016 for largest

    ctx.lineWidth = lineWidth;
    for (let i = 0; i < units; i++) {
      const angle = (i / units) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    }
  }

  // Draw numbers at the slowest hand's tick positions (index 0)
  const numberCount = config.hands[0];
  if (config.numberStyle !== "none") {
    ctx.fillStyle = "black";
    const fontFamily = config.numberStyle === "roman" ? "serif" : "sans-serif";
    ctx.font = `bold ${radius * 0.1}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < numberCount; i++) {
      const angle = (i / numberCount) * Math.PI * 2 - Math.PI / 2;
      const textRadius = radius * 0.8;
      const displayNum =
        i === 0 && config.numberStyle === "roman" ? numberCount : i;
      const text = formatNumber(displayNum || numberCount, config.numberStyle);
      ctx.fillText(
        text,
        centerX + Math.cos(angle) * textRadius,
        centerY + Math.sin(angle) * textRadius
      );
    }
  }

  // Get current time
  const now = new Date();
  const dayFraction = getDayFraction(now);

  // Draw hands: slowest (index 0) first, fastest (last) on top
  const total = config.hands.length;
  for (let i = 0; i < total; i++) {
    const units = config.hands[i];
    const rawValue = getHandValue(dayFraction, i);
    const useSpring = getHandSpring(i);
    let displayValue;

    if (useSpring) {
      // Spring physics - targets integer units for discrete ticking
      const currentUnit = Math.floor(rawValue);
      const state = springStates[i];

      if (currentUnit !== state.lastUnit) {
        // Handle wrap-around
        if (state.lastUnit === units - 1 && currentUnit === 0) {
          state.position -= units;
        }
        state.velocity += SPRING_ACCELERATION;
        state.lastUnit = currentUnit;
      }

      // Target the integer unit, not rawValue (which has fractional part)
      const displacement = currentUnit - state.position;
      const springForce = displacement * SPRING_STIFFNESS;
      state.velocity += springForce;
      state.velocity *= SPRING_DAMPING;
      state.position += state.velocity;

      displayValue = state.position;
    } else {
      // Smooth interpolation (value already includes fractional part)
      displayValue = rawValue;
    }

    const angle = (displayValue / units) * Math.PI * 2 - Math.PI / 2;

    ctx.beginPath();
    ctx.strokeStyle = getHandColor(i, total);
    ctx.lineWidth = radius * getHandWidth(i, total);
    ctx.lineCap = "round";
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * radius * getHandLength(i, total),
      centerY + Math.sin(angle) * radius * getHandLength(i, total)
    );
    ctx.stroke();
  }

  // Center dot
  ctx.beginPath();
  ctx.fillStyle = "black";
  ctx.arc(centerX, centerY, radius * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Digital clock below analog
  const digitSize = radius * 0.12;
  const digitalY = centerY + radius + digitSize * 1.5;
  drawDigitalClock(ctx, centerX, digitalY, dayFraction, digitSize);

  requestAnimationFrame(draw);
}

// === Initialization ===
function init() {
  const urlState = parseUrlState();

  if (urlState) {
    config = urlState;
    presetSelect.value = detectPreset();
  } else {
    // Default to regular 12h
    const preset = PRESETS.regular12;
    config = {
      hands: [...preset.hands],
      numberStyle: preset.numberStyle,
      cyclesPerDay: preset.cyclesPerDay,
    };
    presetSelect.value = "regular12";
  }

  numberStyleSelect.value = config.numberStyle;
  cyclesPerDayInput.value = config.cyclesPerDay;
  initSpringStates();
  renderHandsUI();

  // Only update URL if we loaded from default
  if (!urlState) {
    updateUrl();
  }

  requestAnimationFrame(draw);
}

init();
