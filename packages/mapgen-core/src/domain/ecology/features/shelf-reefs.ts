import type { EngineAdapter } from "@civ7/adapter";
import { tryPlaceFeature } from "./place-feature.js";

export function applyShelfReefs(params: {
  adapter: EngineAdapter;
  reefIndex: number;
  NO_FEATURE: number;
  inBounds: (x: number, y: number) => boolean;
  getRandom: (label: string, max: number) => number;
  shelfReefChance: number;
  passiveShelf: Set<string>;
}): void {
  const { adapter, reefIndex, NO_FEATURE, inBounds, getRandom, shelfReefChance, passiveShelf } = params;

  for (const key of passiveShelf) {
    const [sx, sy] = key.split(",").map(Number);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!adapter.isWater(nx, ny)) continue;
        if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;

        if (getRandom("Shelf Reef", 100) < shelfReefChance) {
          tryPlaceFeature(adapter, nx, ny, reefIndex);
        }
      }
    }
  }
}

