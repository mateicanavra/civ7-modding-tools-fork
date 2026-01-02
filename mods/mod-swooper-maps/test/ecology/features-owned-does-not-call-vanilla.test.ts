import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("does not call adapter.addFeatures when strategy is owned", () => {
    const { ctx, adapter } = createFeaturesTestContext({
      width: 6,
      height: 4,
      rng: () => 0,
    });

    featuresStep.run(ctx, {
      story: { features: { paradiseReefChance: 0, volcanicForestChance: 0, volcanicTaigaChance: 0 } },
      featuresDensity: {
        shelfReefMultiplier: 0,
        rainforestExtraChance: 0,
        forestExtraChance: 0,
        taigaExtraChance: 0,
      },
      featuresPlacement: { strategy: "owned" },
    });

    expect(adapter.calls.addFeatures.length).toBe(0);
  });
});
