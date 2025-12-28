import type { EngineAdapter } from "@civ7/adapter";
import { tryPlaceFeature } from "@mapgen/domain/ecology/features/place-feature.js";

export function applyParadiseReefs(params: {
  adapter: EngineAdapter;
  reefIndex: number;
  NO_FEATURE: number;
  inBounds: (x: number, y: number) => boolean;
  getRandom: (label: string, max: number) => number;
  paradiseReefChance: number;
  hotspotParadise: Set<string>;
}): void {
  const { adapter, reefIndex, NO_FEATURE, inBounds, getRandom, paradiseReefChance, hotspotParadise } = params;

  for (const key of hotspotParadise) {
    const [cx, cy] = key.split(",").map(Number);

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!adapter.isWater(nx, ny)) continue;
        if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;

        if (getRandom("Paradise Reef", 100) < paradiseReefChance) {
          tryPlaceFeature(adapter, nx, ny, reefIndex);
        }
      }
    }
  }
}

