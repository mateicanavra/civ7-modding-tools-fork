import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { inBounds } from "@swooper/mapgen-core";
import { COAST_TERRAIN } from "@swooper/mapgen-core";
import { isWaterAt } from "@mapgen/domain/narrative/utils/water.js";

export function isAdjacentToLand(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!isWaterAt(ctx, nx, ny)) return true;
    }
  }
  return false;
}

export function isCoastalLand(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (isWaterAt(ctx, x, y)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (isWaterAt(ctx, nx, ny)) return true;
    }
  }
  return false;
}

export function isAdjacentToShallowWater(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!ctx.adapter.isWater(nx, ny)) continue;
      if (ctx.adapter.getTerrainType(nx, ny) === COAST_TERRAIN) return true;
    }
  }
  return false;
}
