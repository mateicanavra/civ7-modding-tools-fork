import { inBounds } from "@swooper/mapgen-core/lib/grid";

export function storyKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isNearSeaLane(
  x: number,
  y: number,
  laneRadius: number,
  seaLane: Set<string> | null | undefined
): boolean {
  if (!seaLane || laneRadius <= 0 || seaLane.size === 0) return false;
  for (let my = -laneRadius; my <= laneRadius; my++) {
    for (let mx = -laneRadius; mx <= laneRadius; mx++) {
      const kk = storyKey(x + mx, y + my);
      if (seaLane.has(kk)) return true;
    }
  }
  return false;
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
