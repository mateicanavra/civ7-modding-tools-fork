import { inBounds } from "@mapgen/lib/grid/bounds.js";

export function forEachNeighbor3x3(
  x: number,
  y: number,
  width: number,
  height: number,
  fn: (nx: number, ny: number) => void
): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      fn(nx, ny);
    }
  }
}

export function someNeighbor3x3(
  x: number,
  y: number,
  width: number,
  height: number,
  predicate: (nx: number, ny: number) => boolean
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (predicate(nx, ny)) return true;
    }
  }
  return false;
}

