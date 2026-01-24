import { describe, expect, it } from "bun:test";

import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  runOwnedFeaturePlacements,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("never overwrites existing features", () => {
    const width = 5;
    const height = 4;
    const { ctx, adapter } = createFeaturesTestContext({
      width,
      height,
      rng: () => 0,
    });

    const seedX = 2;
    const seedY = 1;
    const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
    adapter.setFeatureType(seedX, seedY, { Feature: forestIdx, Direction: -1, Elevation: 0 });

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { chances: { FEATURE_FOREST: 100 } },
      wet: { multiplier: 0 },
      aquatic: { multiplier: 0 },
      ice: { multiplier: 0 },
    });

    runOwnedFeaturePlacements({ ctx, placements: featuresPlacement });

    expect(adapter.getFeatureType(seedX, seedY)).toBe(forestIdx);
  });
});
