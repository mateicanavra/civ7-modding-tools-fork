import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import { ecologyArtifacts } from "../../artifacts.js";

const FeaturesApplyStepContract = defineStep({
  id: "features-apply",
  phase: "ecology",
  requires: [],
  provides: [M3_DEPENDENCY_TAGS.field.featureType, M4_EFFECT_TAGS.engine.featuresApplied],
  artifacts: {
    requires: [ecologyArtifacts.featureIntents],
  },
  ops: {
    apply: ecology.ops.applyFeatures,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for applying planned feature placements to the map.",
    }
  ),
});

export default FeaturesApplyStepContract;
