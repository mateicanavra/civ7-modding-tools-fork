import type { ContinentBounds, EngineAdapter } from "@civ7/adapter";
import { Civ7Adapter } from "@civ7/adapter/civ7";

import type { MapRuntimeOptions } from "./types.js";

export function createLayerAdapter(
  options: MapRuntimeOptions,
  width: number,
  height: number
): EngineAdapter {
  if (options.adapter) return options.adapter;
  if (options.createAdapter) return options.createAdapter(width, height);
  return new Civ7Adapter(width, height);
}

export function createDefaultContinentBounds(
  width: number,
  height: number,
  side: "west" | "east"
): ContinentBounds {
  const avoidSeamOffset = 4;
  const polarWaterRows = 2;

  if (side === "west") {
    return {
      west: avoidSeamOffset,
      east: Math.floor(width / 2) - avoidSeamOffset,
      south: polarWaterRows,
      north: height - polarWaterRows,
      continent: 0,
    };
  }

  return {
    west: Math.floor(width / 2) + avoidSeamOffset,
    east: width - avoidSeamOffset,
    south: polarWaterRows,
    north: height - polarWaterRows,
    continent: 1,
  };
}
