export function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

export function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

