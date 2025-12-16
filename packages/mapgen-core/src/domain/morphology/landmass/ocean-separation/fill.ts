import { clampInt } from "../../../../lib/math/index.js";
import type { SetTerrainFn, RowState } from "./types.js";

export function fillLandFromWest(
  state: RowState,
  y: number,
  tiles: number,
  width: number,
  setTerrain: SetTerrainFn,
  flatTerrain: number
): number {
  if (!tiles) return 0;
  let added = 0;
  let x = state.west[y] - 1;
  while (added < tiles && x >= 0) {
    setTerrain(x, y, flatTerrain, true);
    added++;
    x--;
  }
  state.west[y] = clampInt(state.west[y] - added, 0, width - 1);
  return added;
}

export function fillLandFromEast(
  state: RowState,
  y: number,
  tiles: number,
  width: number,
  setTerrain: SetTerrainFn,
  flatTerrain: number
): number {
  if (!tiles) return 0;
  let added = 0;
  let x = state.east[y] + 1;
  while (added < tiles && x < width) {
    setTerrain(x, y, flatTerrain, true);
    added++;
    x++;
  }
  state.east[y] = clampInt(state.east[y] + added, 0, width - 1);
  return added;
}

