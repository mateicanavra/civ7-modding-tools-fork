import { describe, expect, it } from "bun:test";

import featuresStep from "../../src/recipes/standard/stages/ecology/steps/features/index.js";
import { createFeaturesTestContext, disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("does not call adapter.addFeatures when strategy is owned", () => {
    const { ctx, adapter } = createFeaturesTestContext({
      width: 6,
      height: 4,
      rng: () => 0,
    });

    const config = {
      featuresPlacement: {
        vegetated: { strategy: "default", config: { multiplier: 0 } },
        wet: { strategy: "default", config: { multiplier: 0 } },
        aquatic: { strategy: "default", config: { multiplier: 0 } },
        ice: { strategy: "default", config: { multiplier: 0 } },
      },
      reefEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
      vegetationEmbellishments: { strategy: "default", config: { ...disabledEmbellishmentsConfig } },
    };
    const resolvedConfig = featuresStep.normalize(config, { env: ctx.settings, knobs: {} });

    featuresStep.run(ctx, resolvedConfig);

    expect(adapter.calls.addFeatures.length).toBe(0);
  });
});
