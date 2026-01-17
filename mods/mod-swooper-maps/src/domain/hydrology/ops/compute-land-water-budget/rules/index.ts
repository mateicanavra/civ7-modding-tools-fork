export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerp01(value: number, min: number, max: number): number {
  const denom = max - min;
  if (Math.abs(denom) < 1e-6) return value >= max ? 1 : 0;
  return clamp01((value - min) / denom);
}
