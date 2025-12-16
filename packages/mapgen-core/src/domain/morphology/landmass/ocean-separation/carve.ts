import { clampInt } from "../../../../lib/math/index.js";
import type { SetTerrainFn, RowState } from "./types.js";

export function carveOceanFromEast(
  state: RowState,
  y: number,
  tiles: number,
  width: number,
  landMask: Uint8Array | null,
  setTerrain: SetTerrainFn,
  oceanTerrain: number
): number {
  if (!tiles) return 0;
  let removed = 0;
  let x = state.east[y];
  const limit = state.west[y];
  const rowOffset = y * width;
  while (removed < tiles && x >= limit) {
    const idx = rowOffset + x;
    if (!landMask || landMask[idx]) {
      setTerrain(x, y, oceanTerrain, false);
      removed++;
    }
    x--;
  }
  state.east[y] = clampInt(state.east[y] - removed, limit, width - 1);
  return removed;
}

export function carveOceanFromWest(
  state: RowState,
  y: number,
  tiles: number,
  width: number,
  landMask: Uint8Array | null,
  setTerrain: SetTerrainFn,
  oceanTerrain: number
): number {
  if (!tiles) return 0;
  let removed = 0;
  let x = state.west[y];
  const limit = state.east[y];
  const rowOffset = y * width;
  while (removed < tiles && x <= limit) {
    const idx = rowOffset + x;
    if (!landMask || landMask[idx]) {
      setTerrain(x, y, oceanTerrain, false);
      removed++;
    }
    x++;
  }
  state.west[y] = clampInt(state.west[y] + removed, 0, limit);
  return removed;
}

