#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_n;
uniform float u_i;
uniform float u_j;
uniform float u_zoom;

out vec4 fragColor;

const int SEGMENT_PATTERNS[70] = int[70](
  //    t, tr,br,b, bl,tl,m
  /*0*/ 1, 1, 1, 1, 1, 1, 0,
  /*1*/ 0, 1, 1, 0, 0, 0, 0,
  /*2*/ 1, 1, 0, 1, 1, 0, 1,
  /*3*/ 1, 1, 1, 1, 0, 0, 1,
  /*4*/ 0, 1, 1, 0, 0, 1, 1,
  /*5*/ 1, 0, 1, 1, 0, 1, 1,
  /*6*/ 1, 0, 1, 1, 1, 1, 1,
  /*7*/ 1, 1, 1, 0, 0, 0, 0,
  /*8*/ 1, 1, 1, 1, 1, 1, 1,
  /*9*/ 1, 1, 1, 1, 0, 1, 1
);

bool getSegment(in int digit, in int segment) {
  if (digit >= 0 && digit <= 9 && segment >= 0 && segment <= 6) {
    return bool(SEGMENT_PATTERNS[digit * 7 + segment]);
  }
  return false;
}

float draw7Segment(in vec2 uv, in int digit, in float thickness) {
  float verticalThickness = thickness * 2.0;
  float horizontalThickness = thickness;
  float verticalSpacing = thickness*1.75;
  float horizontalSpacing = verticalSpacing * 2.0;
  float verticalCenterSpacing = verticalSpacing * 0.5;

  // Check if current pixel is in any active segment
  float result = 0.0;

  // Segment a (top horizontal)
  if (getSegment(digit, 0)) {
    if (uv.x >= horizontalSpacing && uv.x <= 1.0 - horizontalSpacing && uv.y >= 0.0 && uv.y <= horizontalThickness) {
      result = 1.0;
    }
  }

  // Segment b (top-right vertical)
  if (getSegment(digit, 1)) {
    if (uv.x >= 1.0 - verticalThickness && uv.x <= 1.0 && uv.y >= verticalSpacing && uv.y <= 0.5 - verticalCenterSpacing) {
      result = 1.0;
    }
  }

  // Segment c (bottom-right vertical)
  if (getSegment(digit, 2)) {
    if (uv.x >= 1.0 - verticalThickness && uv.x <= 1.0 && uv.y >= 0.5 + verticalCenterSpacing && uv.y <= 1.0 - verticalSpacing) {
      result = 1.0;
    }
  }

  // Segment d (bottom horizontal)
  if (getSegment(digit, 3)) {
    if (uv.x >= horizontalSpacing && uv.x <= 1.0 - horizontalSpacing && uv.y >= 1.0 - horizontalThickness && uv.y <= 1.0) {
      result = 1.0;
    }
  }

  // Segment e (bottom-left vertical)
  if (getSegment(digit, 4)) {
    if (uv.x >= 0.0 && uv.x <= verticalThickness && uv.y >= 0.5 + verticalCenterSpacing && uv.y <= 1.0 - verticalSpacing) {
      result = 1.0;
    }
  }

  // Segment f (top-left vertical)
  if (getSegment(digit, 5)) {
    if (uv.x >= 0.0 && uv.x <= verticalThickness && uv.y >= verticalSpacing && uv.y <= 0.5 - verticalCenterSpacing) {
      result = 1.0;
    }
  }

  // Segment g (middle horizontal)
  if (getSegment(digit, 6)) {
    if (uv.x >= horizontalSpacing && uv.x <= 1.0 - horizontalSpacing && uv.y >= 0.5 - horizontalThickness * 0.5 && uv.y <= 0.5 + horizontalThickness * 0.5) {
      result = 1.0;
    }
  }

  return result;
}

void main() {
  float minDimension = min(u_resolution.x, u_resolution.y);
  float visibleCells = u_n * (1.0 - u_zoom) + u_zoom;

  // Optimize coordinate calculation to reduce precision loss
  float scale = visibleCells / minDimension;
  float gridX = u_i + (gl_FragCoord.x - 0.5 * u_resolution.x) * scale;
  float gridY = u_j + (0.5 * u_resolution.y - gl_FragCoord.y) * scale;

  if (gridX < 0.0 || gridX >= u_n || gridY < 0.0 || gridY >= u_n) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float iIndex = floor(gridX);
  float jIndex = floor(gridY);

  // Calculate index as iIndex + jIndex * u_n (6-digit number)
  float index = iIndex + jIndex * u_n;

  // Extract hours, minutes, seconds from the 6-digit index
  float hours = floor(index / 10000.0);
  float minutes = floor(mod(index / 100.0, 100.0));
  float seconds = mod(index, 100.0);

  // Check if it's a valid timestamp
  bool isValidTime = (hours < 24.0) && (minutes < 60.0) && (seconds < 60.0);

  // Check if we're near the border of a cell
  float borderThickness = 0.01;
  float localX = fract(gridX);
  float localY = fract(gridY);
  bool isBorder = (localX < borderThickness) || (localX > 1.0 - borderThickness) ||
                 (localY < borderThickness) || (localY > 1.0 - borderThickness);

  // Set base color based on validity and border
  vec4 baseColor;
  if (u_zoom >= 0.9 && isBorder) {
    baseColor = vec4(0.0, 0.0, 0.0, 1.0);  // Black border only when zoomed in
  } else if (isValidTime) {
    baseColor = vec4(0.0, 1.0, 0.0, 1.0);  // Green for valid timestamps
  } else {
    baseColor = vec4(1.0, 0.0, 0.0, 1.0);  // Red for invalid timestamps
  }

  // Calculate local position within the cell for digit rendering
  vec2 cellLocal = vec2(localX, localY);

  // Only render digits if zoomed in enough
  if (u_zoom >= 0.95) {
    // Calculate digit positions (6 digits: HH MM SS)
    // Each digit should be 1/10 of width and 1/6 of height
    float digitWidth = 0.08;  // Slightly smaller to add spacing
    float digitHeight = 1.0 / 6.0;  // 1/6 of cell height

    // Spacing between individual digits and between groups
    float digitSpacing = 0.02;  // Space between individual digits
    float groupSpacing = 0.04;  // Extra space between groups (HH MM SS)

    // Calculate total width needed for all digits and spacing
    float totalDigitWidth = 6.0 * digitWidth + 5.0 * digitSpacing + 2.0 * groupSpacing;
    float horizontalOffset = (1.0 - totalDigitWidth) * 0.5;  // Center the entire digit group
    float verticalOffset = 0.5 - digitHeight * 0.5;  // Center vertically

    // Calculate which digit position (0-5) the current pixel belongs to
    float adjustedX = cellLocal.x - horizontalOffset;
    int digitPos = -1;

    // Check each digit position with proper spacing using a loop
    float digitStartPositions[6];
    digitStartPositions[0] = 0.0;
    digitStartPositions[1] = digitWidth + digitSpacing;
    digitStartPositions[2] = 2.0 * (digitWidth + digitSpacing) + groupSpacing;
    digitStartPositions[3] = 3.0 * (digitWidth + digitSpacing) + groupSpacing;
    digitStartPositions[4] = 4.0 * (digitWidth + digitSpacing) + 2.0 * groupSpacing;
    digitStartPositions[5] = 5.0 * (digitWidth + digitSpacing) + 2.0 * groupSpacing;

    for (int i = 0; i < 6; i++) {
      if (adjustedX >= digitStartPositions[i] && adjustedX < digitStartPositions[i] + digitWidth) {
        digitPos = i;
        break;
      }
    }

    // Check if we're within the digit area
    if (digitPos >= 0 && digitPos < 6 &&
        cellLocal.y >= verticalOffset && cellLocal.y < verticalOffset + digitHeight) {

      // Extract the appropriate digit using switch statement
      int digit = 0;
      switch (digitPos) {
        case 0: digit = int(mod(hours / 10.0, 10.0)); break;
        case 1: digit = int(mod(hours, 10.0)); break;
        case 2: digit = int(mod(minutes / 10.0, 10.0)); break;
        case 3: digit = int(mod(minutes, 10.0)); break;
        case 4: digit = int(mod(seconds / 10.0, 10.0)); break;
        case 5: digit = int(mod(seconds, 10.0)); break;
      }

      // Calculate UV coordinates within the digit (normalized to 0-1)
      float digitStartX = digitStartPositions[digitPos];
      vec2 digitUV = vec2(
        (adjustedX - digitStartX) / digitWidth,
        (cellLocal.y - verticalOffset) / digitHeight
      );

      // Render the digit
      float digitValue = draw7Segment(digitUV, digit, 0.05);

      if (digitValue > 0.0) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);  // White digits
      } else {
        fragColor = baseColor;  // Use the base color (green/red)
      }
    } else {
      fragColor = baseColor;  // Use the base color outside digit area
    }
  } else {
    // When not zoomed in enough, just use the base color without digits or borders
    fragColor = baseColor;
  }
}
