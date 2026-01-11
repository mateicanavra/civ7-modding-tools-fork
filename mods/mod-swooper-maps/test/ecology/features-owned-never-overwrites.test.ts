import { describe, expect, it } from "bun:test";

import ecology from "@mapgen/domain/ecology/ops";
import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  buildDisabledReefEmbellishmentsSelection,
  buildDisabledVegetationEmbellishmentsSelection,
} from "./features-owned.helpers.js";

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

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { chances: { FEATURE_FOREST: 100 } },
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
      ops
    );

    expect(adapter.getFeatureType(seedX, seedY)).toBe(forestIdx);
  });
});
