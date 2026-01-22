const ROMAN_BASE: Record<number, string> = {
  1: 'I',
  5: 'V',
  10: 'X',
  50: 'L',
  100: 'C',
  500: 'D',
  1000: 'M',
};

export function toRoman(n: number): string {
  if (n <= 0) return n.toString();

  let result = '';
  let remaining = n;

  while (remaining >= 1000) {
    result += ROMAN_BASE[1000];
    remaining -= 1000;
  }

  for (const mag of [100, 10, 1]) {
    const digit = Math.floor(remaining / mag);
    remaining %= mag;

    if (digit === 0) continue;

    const one = ROMAN_BASE[mag];
    const five = ROMAN_BASE[mag * 5];
    const ten = ROMAN_BASE[mag * 10];

    if (digit <= 3) {
      result += one.repeat(digit);
    } else if (digit === 4) {
      result += one + five;
    } else if (digit <= 8) {
      result += five + one.repeat(digit - 5);
    } else {
      result += one + ten;
    }
  }

  return result;
}

export function formatNumber(n: number, style: 'arabic' | 'roman' | 'none'): string {
  if (style === 'none') return '';
  if (style === 'roman') return toRoman(n);
  return n.toString();
}
