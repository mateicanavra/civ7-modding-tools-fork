import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

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
        chances: { FEATURE_FOREST: 100 },
      },
    });

    expect(adapter.getFeatureType(seedX, seedY)).toBe(forestIdx);
  });
});
