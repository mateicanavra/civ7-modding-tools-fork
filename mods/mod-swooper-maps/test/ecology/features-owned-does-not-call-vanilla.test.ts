import { describe, expect, it } from "bun:test";

import * as ecology from "@mapgen/domain/ecology/ops";
import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  buildDisabledReefEmbellishmentsSelection,
  buildDisabledVegetationEmbellishmentsSelection,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("does not call adapter.addFeatures when strategy is owned", () => {
    const { ctx, adapter } = createFeaturesTestContext({
      width: 6,
      height: 4,
      rng: () => 0,
    });

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { multiplier: 0 },
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

    expect(adapter.calls.addFeatures.length).toBe(0);
  });
});
