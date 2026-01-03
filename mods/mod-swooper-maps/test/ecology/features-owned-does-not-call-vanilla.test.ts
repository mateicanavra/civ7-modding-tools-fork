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
      featuresPlacement: {},
      reefEmbellishments: { ...disabledEmbellishmentsConfig },
      vegetationEmbellishments: { ...disabledEmbellishmentsConfig },
    };
    const resolvedConfig = featuresStep.resolveConfig
      ? featuresStep.resolveConfig(config, ctx.settings)
      : config;

    featuresStep.run(ctx, resolvedConfig);

    expect(adapter.calls.addFeatures.length).toBe(0);
  });
});
