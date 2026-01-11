import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  disabledEmbellishmentsConfig,
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
    const config = {
      featuresPlacement,
      reefEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
      vegetationEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
    };
    const resolvedConfig = featuresStep.normalize(config, { env: ctx.env, knobs: {} });

    featuresStep.run(ctx, resolvedConfig);

    const warmReef = adapter.getFeatureTypeIndex("FEATURE_REEF");
    const coldReef = adapter.getFeatureTypeIndex("FEATURE_COLD_REEF");

    expect(adapter.getFeatureType(1, 2)).toBe(warmReef);
    expect(adapter.getFeatureType(1, 0)).toBe(coldReef);
  });
});
