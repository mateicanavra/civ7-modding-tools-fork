import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const FeaturesPlanStepContract = defineStep({
  id: "features-plan",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.pedologyV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.featureIntentsV1],
  ops: {
    vegetation: ecology.contracts.planVegetation,
    wetlands: ecology.contracts.planWetlands,
    reefs: ecology.contracts.planReefs,
    ice: ecology.contracts.planIce,
  },
  schema: Type.Object({}),
});

export default FeaturesPlanStepContract;
