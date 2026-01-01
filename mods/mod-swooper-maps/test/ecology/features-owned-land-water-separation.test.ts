import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("keeps land features on land and aquatic features on water", () => {
    const width = 6;
    const height = 4;
    const { ctx, adapter } = createFeaturesTestContext({
      width,
      height,
      rng: () => 0,
      isWater: (_x, y) => y === 0,
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
        strategy: "owned",
        config: {
          chances: {
            FEATURE_FOREST: 100,
            FEATURE_RAINFOREST: 100,
            FEATURE_TAIGA: 100,
            FEATURE_SAVANNA_WOODLAND: 100,
            FEATURE_SAGEBRUSH_STEPPE: 100,
            FEATURE_MARSH: 100,
            FEATURE_TUNDRA_BOG: 100,
            FEATURE_MANGROVE: 100,
            FEATURE_OASIS: 100,
            FEATURE_WATERING_HOLE: 100,
            FEATURE_REEF: 100,
            FEATURE_COLD_REEF: 100,
            FEATURE_ATOLL: 100,
            FEATURE_LOTUS: 100,
            FEATURE_ICE: 100,
          },
          ice: { minAbsLatitude: 90 },
        },
      },
    });

    const landFeatures = new Set([
      adapter.getFeatureTypeIndex("FEATURE_FOREST"),
      adapter.getFeatureTypeIndex("FEATURE_RAINFOREST"),
      adapter.getFeatureTypeIndex("FEATURE_TAIGA"),
      adapter.getFeatureTypeIndex("FEATURE_SAVANNA_WOODLAND"),
      adapter.getFeatureTypeIndex("FEATURE_SAGEBRUSH_STEPPE"),
      adapter.getFeatureTypeIndex("FEATURE_MARSH"),
      adapter.getFeatureTypeIndex("FEATURE_TUNDRA_BOG"),
      adapter.getFeatureTypeIndex("FEATURE_MANGROVE"),
      adapter.getFeatureTypeIndex("FEATURE_OASIS"),
      adapter.getFeatureTypeIndex("FEATURE_WATERING_HOLE"),
    ]);

    const aquaticFeatures = new Set([
      adapter.getFeatureTypeIndex("FEATURE_REEF"),
      adapter.getFeatureTypeIndex("FEATURE_COLD_REEF"),
      adapter.getFeatureTypeIndex("FEATURE_ATOLL"),
      adapter.getFeatureTypeIndex("FEATURE_LOTUS"),
      adapter.getFeatureTypeIndex("FEATURE_ICE"),
    ]);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const feature = adapter.getFeatureType(x, y);
        if (feature === adapter.NO_FEATURE) continue;
        if (adapter.isWater(x, y)) {
          expect(landFeatures.has(feature)).toBe(false);
        } else {
          expect(aquaticFeatures.has(feature)).toBe(false);
        }
      }
    }
  });
});
