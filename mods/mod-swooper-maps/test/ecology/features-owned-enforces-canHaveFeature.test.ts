import { describe, expect, it } from "bun:test";

import ecology from "@mapgen/domain/ecology/ops";
import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  buildDisabledReefEmbellishmentsSelection,
  buildDisabledVegetationEmbellishmentsSelection,
} from "./features-owned.helpers.js";
import { buildTestDeps } from "../support/step-deps.js";

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

    const ops = ecology.ops.bind(featuresStep.contract.ops!).runtime;
    featuresStep.run(
      ctx,
      {
        iceFeaturePlacements: featuresPlacement.ice,
        aquaticFeaturePlacements: featuresPlacement.aquatic,
        wetFeaturePlacements: featuresPlacement.wet,
        vegetatedFeaturePlacements: featuresPlacement.vegetated,
        reefEmbellishments: buildDisabledReefEmbellishmentsSelection(),
        vegetationEmbellishments: buildDisabledVegetationEmbellishmentsSelection(),
      },
      ops,
      buildTestDeps(featuresStep)
    );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(adapter.getFeatureType(x, y)).not.toBe(forestIdx);
      }
    }
  });
});
