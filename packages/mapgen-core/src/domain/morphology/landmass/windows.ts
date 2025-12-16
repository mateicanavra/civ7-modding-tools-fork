import { clampInt } from "../../../lib/math/index.js";
import type { GeometryPostConfig, LandmassWindow, PlateStats } from "./types.js";

interface WindowWithMeta extends LandmassWindow {
  plateId: number;
  centerX: number;
  count: number;
}

export function windowFromPlateStat(
  stat: PlateStats,
  width: number,
  height: number,
  postCfg: GeometryPostConfig
): WindowWithMeta | null {
  if (stat.count <= 0 || stat.maxX < stat.minX || stat.maxY < stat.minY) return null;

  const minWidth = postCfg.minWidthTiles ? Math.max(1, Math.trunc(postCfg.minWidthTiles)) : 0;
  const polarRows = 0;

  const expand = postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
  const expandWest = postCfg.expandWestTiles ? Math.trunc(postCfg.expandWestTiles) : 0;
  const expandEast = postCfg.expandEastTiles ? Math.trunc(postCfg.expandEastTiles) : 0;

  let west = Math.max(0, stat.minX - Math.max(0, expand + expandWest));
  let east = Math.min(width - 1, stat.maxX + Math.max(0, expand + expandEast));

  if (minWidth > 0) {
    const span = east - west + 1;
    if (span < minWidth) {
      const deficit = minWidth - span;
      const extraWest = Math.floor(deficit / 2);
      const extraEast = deficit - extraWest;
      west = Math.max(0, west - extraWest);
      east = Math.min(width - 1, east + extraEast);
    }
  }

  if (postCfg.clampWestMin != null) {
    west = Math.max(west, Math.max(0, Math.trunc(postCfg.clampWestMin)));
  }
  if (postCfg.clampEastMax != null) {
    east = Math.min(east, Math.min(width - 1, Math.trunc(postCfg.clampEastMax)));
  }

  const verticalPad = Math.max(0, expand);
  const baseSouth = Math.max(polarRows, stat.minY - verticalPad);
  const baseNorth = Math.min(height - polarRows, stat.maxY + verticalPad);

  const south =
    postCfg.overrideSouth != null
      ? clampInt(Math.trunc(postCfg.overrideSouth), 0, height - 1)
      : clampInt(baseSouth, 0, height - 1);
  const north =
    postCfg.overrideNorth != null
      ? clampInt(Math.trunc(postCfg.overrideNorth), 0, height - 1)
      : clampInt(baseNorth, 0, height - 1);

  return {
    plateId: stat.plateId,
    west,
    east,
    south,
    north,
    centerX: (west + east) * 0.5,
    count: stat.count,
    continent: 0,
  };
}

export function windowsFromPlateStats(
  plateStats: Iterable<PlateStats>,
  width: number,
  height: number,
  postCfg: GeometryPostConfig
): LandmassWindow[] {
  const windows: WindowWithMeta[] = [];

  for (const stat of plateStats) {
    const win = windowFromPlateStat(stat, width, height, postCfg);
    if (win) windows.push(win);
  }

  windows.sort((a, b) => a.centerX - b.centerX);

  return windows.map((win, index) => ({
    west: win.west,
    east: win.east,
    south: win.south,
    north: win.north,
    continent: index,
  }));
}

