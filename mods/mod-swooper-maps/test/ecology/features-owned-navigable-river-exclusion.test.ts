import { describe, expect, it } from "bun:test";

import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  runOwnedFeaturePlacements,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("never places land features on navigable river plots", () => {
    const width = 5;
    const height = 5;
    const { ctx, adapter } = createFeaturesTestContext({
      width,
      height,
      rng: () => 0,
    });

    const riverX = 2;
    const riverY = 2;
    const navigableRiver = adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");
    adapter.setTerrainType(riverX, riverY, navigableRiver);
    ctx.buffers.heightfield.terrain[riverY * width + riverX] = navigableRiver;

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { chances: { FEATURE_FOREST: 100 } },
      wet: { multiplier: 0 },
      aquatic: { multiplier: 0 },
      ice: { multiplier: 0 },
    });

    runOwnedFeaturePlacements({ ctx, placements: featuresPlacement });

    expect(adapter.getFeatureType(riverX, riverY)).toBe(adapter.NO_FEATURE);
  });
});
