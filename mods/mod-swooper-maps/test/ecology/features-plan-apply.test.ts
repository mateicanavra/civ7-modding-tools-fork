import { describe, expect, it } from "bun:test";

import featuresPlanStep from "../../src/recipes/standard/stages/ecology/steps/features-plan/index.js";
import featuresApplyStep from "../../src/recipes/standard/stages/ecology/steps/features-apply/index.js";
import { M3_DEPENDENCY_TAGS } from "../../src/recipes/standard/tags.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";

describe("features plan/apply pipeline", () => {
  it("publishes intents and applies placements", () => {
    const { ctx } = createFeaturesTestContext({
      width: 4,
      height: 3,
      rng: () => 0,
    });

    const planConfig = featuresPlanStep.normalize(
      {
        vegetation: { strategy: "default", config: {} },
        wetlands: { strategy: "default", config: {} },
        reefs: { strategy: "default", config: {} },
        ice: { strategy: "default", config: {} },
      },
      { env: ctx.env, knobs: {} }
    );
    featuresPlanStep.run(ctx, planConfig);

    const intents = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.featureIntentsV1);
    expect(intents).toBeTruthy();
    expect(intents?.vegetation.length).toBeGreaterThanOrEqual(0);

    const applyConfig = featuresApplyStep.normalize({ apply: { strategy: "default", config: {} } }, { env: ctx.env, knobs: {} });
    featuresApplyStep.run(ctx, applyConfig);

    const featureField = ctx.fields.featureType;
    expect(featureField).toBeDefined();
  });
});
