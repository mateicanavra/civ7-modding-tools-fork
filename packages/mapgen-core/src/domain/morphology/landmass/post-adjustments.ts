import { clampInt } from "../../../lib/math/index.js";
import type { GeometryConfig, LandmassWindow } from "./types.js";

export function applyLandmassPostAdjustments(
  windows: LandmassWindow[],
  geometry: GeometryConfig | null | undefined,
  width: number,
  height: number
): LandmassWindow[] {
  if (!Array.isArray(windows) || windows.length === 0) return windows;

  const post = geometry?.post;
  if (!post || typeof post !== "object") return windows;

  const expandAll = Number.isFinite(post.expandTiles) ? Math.trunc(post.expandTiles!) : 0;
  const expandWest = Number.isFinite(post.expandWestTiles) ? Math.trunc(post.expandWestTiles!) : 0;
  const expandEast = Number.isFinite(post.expandEastTiles) ? Math.trunc(post.expandEastTiles!) : 0;
  const clampWest =
    Number.isFinite(post.clampWestMin) ? Math.max(0, Math.trunc(post.clampWestMin!)) : null;
  const clampEast =
    Number.isFinite(post.clampEastMax) ? Math.min(width - 1, Math.trunc(post.clampEastMax!)) : null;
  const overrideSouth =
    Number.isFinite(post.overrideSouth)
      ? clampInt(Math.trunc(post.overrideSouth!), 0, height - 1)
      : null;
  const overrideNorth =
    Number.isFinite(post.overrideNorth)
      ? clampInt(Math.trunc(post.overrideNorth!), 0, height - 1)
      : null;
  const minWidth =
    Number.isFinite(post.minWidthTiles) ? Math.max(0, Math.trunc(post.minWidthTiles!)) : null;

  let changed = false;
  const adjusted = windows.map((win) => {
    if (!win) return win;

    let west = clampInt(win.west | 0, 0, width - 1);
    let east = clampInt(win.east | 0, 0, width - 1);
    let south = clampInt(win.south | 0, 0, height - 1);
    let north = clampInt(win.north | 0, 0, height - 1);

    const expansionWest = expandAll + expandWest;
    const expansionEast = expandAll + expandEast;

    if (expansionWest > 0) west = clampInt(west - expansionWest, 0, width - 1);
    if (expansionEast > 0) east = clampInt(east + expansionEast, 0, width - 1);
    if (clampWest != null) west = Math.max(west, clampWest);
    if (clampEast != null) east = Math.min(east, clampEast);

    if (minWidth != null && minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = clampInt(west - extraWest, 0, width - 1);
        east = clampInt(east + extraEast, 0, width - 1);
      }
    }

    if (overrideSouth != null) south = overrideSouth;
    if (overrideNorth != null) north = overrideNorth;

    const mutated = west !== win.west || east !== win.east || south !== win.south || north !== win.north;

    if (mutated) changed = true;
    if (!mutated) return win;

    return { west, east, south, north, continent: win.continent };
  });

  return changed ? adjusted : windows;
}

