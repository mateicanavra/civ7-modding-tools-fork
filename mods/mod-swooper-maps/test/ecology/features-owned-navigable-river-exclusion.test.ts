import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

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
        groups: { aquatic: { enabled: false }, ice: { enabled: false } },
        chances: { FEATURE_FOREST: 100 },
      },
    });

    expect(adapter.getFeatureType(riverX, riverY)).toBe(adapter.NO_FEATURE);
  });
});
