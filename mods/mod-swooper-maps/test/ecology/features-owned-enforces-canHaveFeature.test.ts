import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext, disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

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

    const config = {
      featuresPlacement: {
        vegetated: {
          strategy: "default",
          config: {
            chances: {
              FEATURE_FOREST: 100,
              FEATURE_RAINFOREST: 0,
              FEATURE_TAIGA: 0,
              FEATURE_SAVANNA_WOODLAND: 0,
              FEATURE_SAGEBRUSH_STEPPE: 0,
            },
          },
        },
        wet: { strategy: "default", config: { multiplier: 0 } },
        aquatic: { strategy: "default", config: { multiplier: 0 } },
        ice: { strategy: "default", config: { multiplier: 0 } },
      },
      reefEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
      vegetationEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
    };
    const resolvedConfig = featuresStep.normalize(config, { env: ctx.env, knobs: {} });

    featuresStep.run(ctx, resolvedConfig);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(adapter.getFeatureType(x, y)).not.toBe(forestIdx);
      }
    }
  });
});
