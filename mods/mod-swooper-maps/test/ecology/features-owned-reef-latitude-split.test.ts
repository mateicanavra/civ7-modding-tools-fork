import { describe, expect, it } from "bun:test";

import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  runOwnedFeaturePlacements,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("selects reef vs cold reef based on latitude split", () => {
    const width = 3;
    const height = 4;
    const { ctx, adapter } = createFeaturesTestContext({
      width,
      height,
      rng: () => 0,
      isWater: () => true,
    });
    ctx.env.latitudeBounds = { topLatitude: 80, bottomLatitude: -80 };

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { multiplier: 0 },
      wet: { multiplier: 0 },
      aquatic: {
        rules: { reefLatitudeSplit: 55 },
        chances: {
          FEATURE_REEF: 100,
          FEATURE_COLD_REEF: 100,
          FEATURE_ATOLL: 0,
          FEATURE_LOTUS: 0,
        },
      },
      ice: { multiplier: 0 },
    });

    runOwnedFeaturePlacements({ ctx, placements: featuresPlacement });

    const warmReef = adapter.getFeatureTypeIndex("FEATURE_REEF");
    const coldReef = adapter.getFeatureTypeIndex("FEATURE_COLD_REEF");

    expect(adapter.getFeatureType(1, 2)).toBe(warmReef);
    expect(adapter.getFeatureType(1, 0)).toBe(coldReef);
  });
});
