export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function clampInt(value: number, min: number, max: number): number {
  const v = Math.trunc(value);
  if (!Number.isFinite(v)) return min;
  return clamp(v, min, max);
}

export function clampPct(value: number, min: number, max: number, fallback: number = min): number {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

