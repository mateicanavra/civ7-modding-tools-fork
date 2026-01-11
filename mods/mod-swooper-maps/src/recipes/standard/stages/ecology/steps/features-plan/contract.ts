import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const FeaturesPlanStepContract = defineStepContract({
  id: "features-plan",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.pedologyV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.featureIntentsV1],
  schema: Type.Object(
    {
      vegetation: ecology.ops.planVegetation.config,
      wetlands: ecology.ops.planWetlands.config,
      reefs: ecology.ops.planReefs.config,
      ice: ecology.ops.planIce.config,
    },
    { additionalProperties: false }
  ),
});

export default FeaturesPlanStepContract;
