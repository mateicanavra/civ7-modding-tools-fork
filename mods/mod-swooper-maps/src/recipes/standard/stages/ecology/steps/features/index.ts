import { Type } from "typebox";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import type { ResolvedFeaturesPlacementConfig } from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import {
  buildFeaturesPlacementInput,
  buildReefEmbellishmentsInput,
  buildVegetationEmbellishmentsInput,
} from "./inputs.js";
import { applyFeaturePlacements, reifyFeatureField } from "./apply.js";
import { resolveFeatureKeyLookups } from "./feature-keys.js";

const FeaturesStepConfigSchema = Type.Object(
  {
    featuresPlacement: ecology.ops.planFeaturePlacements.config,
    reefEmbellishments: ecology.ops.planReefEmbellishments.config,
    vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.config,
  },
  {
    additionalProperties: false,
    default: {
      featuresPlacement: ecology.ops.planFeaturePlacements.defaultConfig,
      reefEmbellishments: ecology.ops.planReefEmbellishments.defaultConfig,
      vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.defaultConfig,
    },
  }
);

type FeaturesPlacementOpConfig = typeof ecology.ops.planFeaturePlacements.defaultConfig;
type ReefEmbellishmentsOpConfig = typeof ecology.ops.planReefEmbellishments.defaultConfig;
type VegetationEmbellishmentsOpConfig =
  typeof ecology.ops.planVegetationEmbellishments.defaultConfig;
type FeaturesStepConfig = {
  featuresPlacement: FeaturesPlacementOpConfig;
  reefEmbellishments: ReefEmbellishmentsOpConfig;
  vegetationEmbellishments: VegetationEmbellishmentsOpConfig;
};

export default createStep({
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
  resolveConfig: (config, settings) => {
    return {
      featuresPlacement: ecology.ops.planFeaturePlacements.resolveConfig(
        config.featuresPlacement,
        settings
      ),
      reefEmbellishments: ecology.ops.planReefEmbellishments.resolveConfig(
        config.reefEmbellishments,
        settings
      ),
      vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.resolveConfig(
        config.vegetationEmbellishments,
        settings
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const placementInput = buildFeaturesPlacementInput(
      context,
      config.featuresPlacement.config as ResolvedFeaturesPlacementConfig,
      featureLookups
    );
    const placementResult = ecology.ops.planFeaturePlacements.runValidated(
      placementInput,
      config.featuresPlacement
    );

    if (placementResult.placements.length > 0) {
      applyFeaturePlacements(context, placementResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups);
    const reefResult = ecology.ops.planReefEmbellishments.runValidated(
      reefInput,
      config.reefEmbellishments
    );

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(context, featureLookups);
    const vegetationResult = ecology.ops.planVegetationEmbellishments.runValidated(
      vegetationInput,
      config.vegetationEmbellishments
    );

    if (vegetationResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetationResult.placements, featureLookups);
    }

    reifyFeatureField(context);
    context.adapter.validateAndFixTerrain();
    syncHeightfield(context);
    context.adapter.recalculateAreas();
  },
} as const);
