import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const FeaturesApplyStepContract = defineStep({
  id: "features-apply",
  phase: "ecology",
  requires: [M3_DEPENDENCY_TAGS.artifact.featureIntentsV1],
  provides: [M3_DEPENDENCY_TAGS.field.featureType, M4_EFFECT_TAGS.engine.featuresApplied],
  ops: {
    apply: ecology.contracts.applyFeatures,
  },
  schema: Type.Object({}),
});

export default FeaturesApplyStepContract;
