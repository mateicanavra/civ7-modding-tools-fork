import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext, disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

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
    ctx.buffers.heightfield.terrain[riverY * width + riverX] = navigableRiver;

    const config = {
      featuresPlacement: {
        vegetated: { strategy: "default", config: { chances: { FEATURE_FOREST: 100 } } },
        wet: { strategy: "default", config: { multiplier: 0 } },
        aquatic: { strategy: "default", config: { multiplier: 0 } },
        ice: { strategy: "default", config: { multiplier: 0 } },
      },
      reefEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
      vegetationEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
    };
    const resolvedConfig = featuresStep.normalize(config, { env: ctx.settings, knobs: {} });

    featuresStep.run(ctx, resolvedConfig);

    expect(adapter.getFeatureType(riverX, riverY)).toBe(adapter.NO_FEATURE);
  });
});
