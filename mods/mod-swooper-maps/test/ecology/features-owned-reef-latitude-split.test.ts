import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

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

    featuresStep.run(ctx, {
      story: { features: { paradiseReefChance: 0, volcanicForestChance: 0, volcanicTaigaChance: 0 } },
      featuresDensity: {
        shelfReefMultiplier: 0,
        rainforestExtraChance: 0,
        forestExtraChance: 0,
        taigaExtraChance: 0,
      },
      featuresPlacement: {
        mode: "owned",
        groups: { vegetated: { enabled: false }, wet: { enabled: false }, ice: { enabled: false } },
        aquatic: { reefLatitudeSplit: 55 },
        chances: {
          FEATURE_REEF: 100,
          FEATURE_COLD_REEF: 100,
          FEATURE_ATOLL: 0,
          FEATURE_LOTUS: 0,
        },
      },
    });

    const warmReef = adapter.getFeatureTypeIndex("FEATURE_REEF");
    const coldReef = adapter.getFeatureTypeIndex("FEATURE_COLD_REEF");

    expect(adapter.getFeatureType(1, 2)).toBe(warmReef);
    expect(adapter.getFeatureType(1, 0)).toBe(coldReef);
  });
});
