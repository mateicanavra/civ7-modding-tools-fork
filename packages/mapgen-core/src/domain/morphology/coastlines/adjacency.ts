import { inBounds } from "@mapgen/lib/grid/bounds.js";
import { someNeighbor3x3 } from "@mapgen/lib/grid/neighborhood/square-3x3.js";

export function isCoastalLand(
  x: number,
  y: number,
  width: number,
  height: number,
  isWater: (x: number, y: number) => boolean
): boolean {
  if (isWater(x, y)) return false;
  return someNeighbor3x3(x, y, width, height, (nx, ny) => isWater(nx, ny));
}

export function isAdjacentToLand(
  x: number,
  y: number,
  width: number,
  height: number,
  isWater: (x: number, y: number) => boolean,
  radius: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!isWater(nx, ny)) return true;
    }
  }
  return false;
}

