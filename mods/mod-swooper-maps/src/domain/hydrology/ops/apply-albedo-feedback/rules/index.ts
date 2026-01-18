export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp01(value: number, start: number, full: number): number {
  const denom = start - full;
  if (Math.abs(denom) < 1e-6) return value <= full ? 1 : 0;
  return clamp01((start - value) / denom);
}
