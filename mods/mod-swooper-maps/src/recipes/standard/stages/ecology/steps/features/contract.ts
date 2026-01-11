import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const FeaturesStepContract = defineStep({
  id: "features",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.field.biomeId,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.field.featureType, M4_EFFECT_TAGS.engine.featuresApplied],
  ops: {
    iceFeaturePlacements: ecology.ops.planIceFeaturePlacements,
    aquaticFeaturePlacements: ecology.ops.planAquaticFeaturePlacements,
    wetFeaturePlacements: ecology.ops.planWetFeaturePlacements,
    vegetatedFeaturePlacements: ecology.ops.planVegetatedFeaturePlacements,
    reefEmbellishments: ecology.ops.planReefEmbellishments,
    vegetationEmbellishments: ecology.ops.planVegetationEmbellishments,
  },
  schema: Type.Object({}),
});

export default FeaturesStepContract;
