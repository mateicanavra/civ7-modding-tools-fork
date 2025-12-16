import { clampInt } from "../../../../lib/math/index.js";
import type { LandmassWindow } from "../types.js";
import type { RowState } from "./types.js";

export function normalizeWindow(
  win: Partial<LandmassWindow> | null | undefined,
  index: number,
  width: number,
  height: number
): LandmassWindow {
  if (!win) {
    return {
      west: 0,
      east: Math.max(0, width - 1),
      south: 0,
      north: Math.max(0, height - 1),
      continent: index,
    };
  }
  const west = clampInt(win.west ?? 0, 0, width - 1);
  const east = clampInt(win.east ?? width - 1, 0, width - 1);
  const south = clampInt(win.south ?? 0, 0, height - 1);
  const north = clampInt(win.north ?? height - 1, 0, height - 1);
  return {
    west: Math.min(west, east),
    east: Math.max(west, east),
    south: Math.min(south, north),
    north: Math.max(south, north),
    continent: win.continent ?? index,
  };
}

export function createRowState(
  win: Partial<LandmassWindow> | null | undefined,
  index: number,
  width: number,
  height: number
): RowState {
  const normalized = normalizeWindow(win, index, width, height);
  const west = new Int16Array(height);
  const east = new Int16Array(height);
  for (let y = 0; y < height; y++) {
    west[y] = normalized.west;
    east[y] = normalized.east;
  }
  return {
    index,
    west,
    east,
    south: normalized.south,
    north: normalized.north,
    continent: normalized.continent,
  };
}

export function aggregateRowState(state: RowState, width: number, height: number): LandmassWindow {
  let minWest = width - 1;
  let maxEast = 0;
  const south = clampInt(state.south, 0, height - 1);
  const north = clampInt(state.north, 0, height - 1);
  for (let y = south; y <= north; y++) {
    if (state.west[y] > state.east[y]) continue;
    if (state.west[y] < minWest) minWest = state.west[y];
    if (state.east[y] > maxEast) maxEast = state.east[y];
  }

  if (maxEast < minWest) {
    return {
      west: 0,
      east: 0,
      south,
      north,
      continent: state.continent,
    };
  }

  return {
    west: clampInt(minWest, 0, width - 1),
    east: clampInt(maxEast, 0, width - 1),
    south,
    north,
    continent: state.continent,
  };
}

