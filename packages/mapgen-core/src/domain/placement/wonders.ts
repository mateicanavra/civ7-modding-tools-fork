import type { EngineAdapter } from "@civ7/adapter";
import type { MapInfo } from "./types.js";

export function resolveNaturalWonderCount(mapInfo: MapInfo | undefined, wondersPlusOne: boolean): number {
  if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
    return 1;
  }
  if (wondersPlusOne) {
    return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  }
  return mapInfo.NumNaturalWonders;
}

export function applyNaturalWonders(
  adapter: EngineAdapter,
  width: number,
  height: number,
  mapInfo: MapInfo | undefined,
  wondersPlusOne: boolean
): void {
  const wonders = resolveNaturalWonderCount(mapInfo, wondersPlusOne);
  adapter.addNaturalWonders(width, height, wonders);
}

