export function isNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

export function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function notZero(n: number): boolean {
  return Number.isFinite(n) && n !== 0;
}