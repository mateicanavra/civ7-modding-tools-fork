import { describe, expect, it } from "bun:test";

import * as ecology from "@mapgen/domain/ecology";
import featuresPlanStep from "../../src/recipes/standard/stages/ecology/steps/features-plan/index.js";
import featuresApplyStep from "../../src/recipes/standard/stages/ecology/steps/features-apply/index.js";
import { M3_DEPENDENCY_TAGS } from "../../src/recipes/standard/tags.js";
import { createFeaturesTestContext } from "./features-owned.helpers.js";
import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";

describe("features plan/apply pipeline", () => {
  it("publishes intents and applies placements", () => {
    const { ctx } = createFeaturesTestContext({
      width: 4,
      height: 3,
      rng: () => 0,
    });

    const planConfig = {
      vegetation: normalizeOpSelectionOrThrow(ecology.ops.planVegetation, {
        strategy: "default",
        config: {},
      }),
      wetlands: normalizeOpSelectionOrThrow(ecology.ops.planWetlands, {
        strategy: "default",
        config: {},
      }),
      reefs: normalizeOpSelectionOrThrow(ecology.ops.planReefs, { strategy: "default", config: {} }),
      ice: normalizeOpSelectionOrThrow(ecology.ops.planIce, { strategy: "default", config: {} }),
    };
    const planOps = ecology.ops.bind(featuresPlanStep.contract.ops!).runtime;
    featuresPlanStep.run(ctx, planConfig, planOps);

    const intents = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.featureIntentsV1);
    expect(intents).toBeTruthy();
    expect(intents?.vegetation.length).toBeGreaterThanOrEqual(0);

    const applyConfig = {
      apply: normalizeOpSelectionOrThrow(ecology.ops.applyFeatures, { strategy: "default", config: {} }),
    };
    const applyOps = ecology.ops.bind(featuresApplyStep.contract.ops!).runtime;
    featuresApplyStep.run(ctx, applyConfig, applyOps);

    const featureField = ctx.fields.featureType;
    expect(featureField).toBeDefined();
  });
});
