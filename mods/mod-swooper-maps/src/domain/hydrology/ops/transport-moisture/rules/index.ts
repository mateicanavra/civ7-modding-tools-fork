import { idx } from "@swooper/mapgen-core";

export function upwindOffset(
  u: number,
  v: number,
  absLatDeg: number
): { dx: number; dy: number } {
  if (Math.abs(u) >= Math.abs(v)) {
    if (u !== 0) return { dx: u > 0 ? 1 : -1, dy: 0 };
  } else if (v !== 0) {
    return { dx: 0, dy: v > 0 ? 1 : -1 };
  }

  return absLatDeg < 30 || absLatDeg >= 60 ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 };
}

export function upwindIndex(
  x: number,
  y: number,
  width: number,
  height: number,
  dx: number,
  dy: number
): number {
  const nx = x - dx;
  const ny = y - dy;
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) return idx(x, y, width);
  return idx(nx, ny, width);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
