import { clamp01 } from "@mapgen/lib/math/clamp.js";

export function normalizeRange(value: number, min: number, max: number): number {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
}
