import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyPreArtifacts } from "../../../hydrology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../../narrative-pre/artifacts.js";

const FeaturesStepContract = defineStep({
  id: "features",
  phase: "ecology",
  requires: [M3_DEPENDENCY_TAGS.field.biomeId],
  provides: [M3_DEPENDENCY_TAGS.field.featureType, M4_EFFECT_TAGS.engine.featuresApplied],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.climateField,
      hydrologyPreArtifacts.heightfield,
      ecologyArtifacts.biomeClassification,
      narrativePreArtifacts.overlays,
    ],
  },
  ops: {
    iceFeaturePlacements: ecology.ops.planIceFeaturePlacements,
    aquaticFeaturePlacements: ecology.ops.planAquaticFeaturePlacements,
    wetFeaturePlacements: ecology.ops.planWetFeaturePlacements,
    vegetatedFeaturePlacements: ecology.ops.planVegetatedFeaturePlacements,
    reefEmbellishments: ecology.ops.planReefEmbellishments,
    vegetationEmbellishments: ecology.ops.planVegetationEmbellishments,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for combined feature placement and embellishment passes.",
    }
  ),
});

export default FeaturesStepContract;
