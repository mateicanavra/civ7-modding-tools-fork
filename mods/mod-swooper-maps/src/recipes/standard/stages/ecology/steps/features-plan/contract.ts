import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecologyContracts from "@mapgen/domain/ecology/contracts";
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
    vegetation: ecologyContracts.planVegetation,
    wetlands: ecologyContracts.planWetlands,
    reefs: ecologyContracts.planReefs,
    ice: ecologyContracts.planIce,
  },
  schema: Type.Object({}),
});

export default FeaturesPlanStepContract;
