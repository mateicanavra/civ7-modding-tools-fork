import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../../hydrology-climate-baseline/artifacts.js";

const FeaturesPlanStepContract = defineStep({
  id: "features-plan",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      ecologyArtifacts.biomeClassification,
      hydrologyClimateBaselineArtifacts.heightfield,
      ecologyArtifacts.pedology,
    ],
    provides: [ecologyArtifacts.featureIntents],
  },
  ops: {
    vegetation: ecology.ops.planVegetation,
    vegetatedFeaturePlacements: ecology.ops.planVegetatedFeaturePlacements,
    wetlands: ecology.ops.planWetlands,
    wetFeaturePlacements: ecology.ops.planWetFeaturePlacements,
    reefs: ecology.ops.planReefs,
    ice: ecology.ops.planIce,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for planning vegetation, wetlands, reefs, and ice features.",
    }
  ),
});

export default FeaturesPlanStepContract;
