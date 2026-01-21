import { describe, expect, it } from "bun:test";

import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  runOwnedFeaturePlacements,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("respects adapter.canHaveFeature gating", () => {
    const width = 4;
    const height = 4;

    const { ctx, adapter } = createFeaturesTestContext({
      width,
      height,
      rng: () => 0,
      defaultBiomeIndex: 4,
    });
    const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
    adapter.reset({
      canHaveFeature: (_x, _y, featureType) => featureType !== forestIdx,
    });

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: {
        chances: {
          FEATURE_FOREST: 100,
          FEATURE_RAINFOREST: 0,
          FEATURE_TAIGA: 0,
          FEATURE_SAVANNA_WOODLAND: 0,
          FEATURE_SAGEBRUSH_STEPPE: 0,
        },
      },
      wet: { multiplier: 0 },
      aquatic: { multiplier: 0 },
      ice: { multiplier: 0 },
    });

    runOwnedFeaturePlacements({ ctx, placements: featuresPlacement });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(adapter.getFeatureType(x, y)).not.toBe(forestIdx);
      }
    }
  });
});
