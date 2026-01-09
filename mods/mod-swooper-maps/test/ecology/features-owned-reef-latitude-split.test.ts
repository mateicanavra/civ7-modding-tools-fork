import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext, disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

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

    const config = {
      featuresPlacement: {
        vegetated: { strategy: "default", config: { multiplier: 0 } },
        wet: { strategy: "default", config: { multiplier: 0 } },
        aquatic: {
          strategy: "default",
          config: {
            rules: { reefLatitudeSplit: 55 },
            chances: {
              FEATURE_REEF: 100,
              FEATURE_COLD_REEF: 100,
              FEATURE_ATOLL: 0,
              FEATURE_LOTUS: 0,
            },
          },
        },
        ice: { strategy: "default", config: { multiplier: 0 } },
      },
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
