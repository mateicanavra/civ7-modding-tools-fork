import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const FeaturesStepConfigSchema = Type.Object(
  {
    featuresPlacement: Type.Object(
      {
        vegetated: ecology.ops.planVegetatedFeaturePlacements.config,
        wet: ecology.ops.planWetFeaturePlacements.config,
        aquatic: ecology.ops.planAquaticFeaturePlacements.config,
        ice: ecology.ops.planIceFeaturePlacements.config,
      },
      {
        additionalProperties: false,
        default: {
          vegetated: ecology.ops.planVegetatedFeaturePlacements.defaultConfig,
          wet: ecology.ops.planWetFeaturePlacements.defaultConfig,
          aquatic: ecology.ops.planAquaticFeaturePlacements.defaultConfig,
          ice: ecology.ops.planIceFeaturePlacements.defaultConfig,
        },
      }
    ),
    reefEmbellishments: ecology.ops.planReefEmbellishments.config,
    vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.config,
  },
  {
    additionalProperties: false,
    default: {
      featuresPlacement: {
        vegetated: ecology.ops.planVegetatedFeaturePlacements.defaultConfig,
        wet: ecology.ops.planWetFeaturePlacements.defaultConfig,
        aquatic: ecology.ops.planAquaticFeaturePlacements.defaultConfig,
        ice: ecology.ops.planIceFeaturePlacements.defaultConfig,
      },
      reefEmbellishments: ecology.ops.planReefEmbellishments.defaultConfig,
      vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.defaultConfig,
    },
  }
);

export const FeaturesStepContract = defineStepContract({
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
  schema: FeaturesStepConfigSchema,
});
