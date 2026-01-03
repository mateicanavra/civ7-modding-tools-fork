import { Type, type Static } from "typebox";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import { buildFeaturesEmbellishmentsInput, buildFeaturesPlacementInput } from "./inputs.js";
import { applyFeaturePlacements, reifyFeatureField } from "./apply.js";

const FeaturesStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: ecology.FeaturesConfigSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: ecology.FeaturesDensityConfigSchema,
    featuresPlacement: ecology.ops.featuresPlacement.config,
  },
  {
    additionalProperties: false,
    default: {
      story: {},
      featuresDensity: {},
      featuresPlacement: ecology.ops.featuresPlacement.defaultConfig,
    },
  }
);

type FeaturesStepConfig = Static<typeof FeaturesStepConfigSchema>;

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
  provides: [
    M3_DEPENDENCY_TAGS.field.featureType,
    M4_EFFECT_TAGS.engine.featuresApplied,
  ],
  schema: FeaturesStepConfigSchema,
  resolveConfig: (config, settings) => {
    if (!ecology.ops.featuresPlacement.resolveConfig) {
      throw new Error("featuresPlacement op missing resolveConfig");
    }
    return {
      ...config,
      featuresPlacement: ecology.ops.featuresPlacement.resolveConfig(
        config.featuresPlacement,
        settings
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const { width, height } = context.dimensions;

    const placementInput = buildFeaturesPlacementInput(context);
    const placementResult = ecology.ops.featuresPlacement.run(
      placementInput,
      config.featuresPlacement
    );

    if (placementResult.useEngineBaseline) {
      context.adapter.addFeatures(width, height);
    } else if (placementResult.placements.length > 0) {
      applyFeaturePlacements(context, placementResult.placements);
    }

    const embellishmentInput = buildFeaturesEmbellishmentsInput(context);
    const embellishmentResult = ecology.ops.featuresEmbellishments.run(embellishmentInput, {
      story: config.story,
      featuresDensity: config.featuresDensity,
    });

    if (embellishmentResult.placements.length > 0) {
      applyFeaturePlacements(context, embellishmentResult.placements);
    }

    reifyFeatureField(context);
    context.adapter.validateAndFixTerrain();
    syncHeightfield(context);
    context.adapter.recalculateAreas();
  },
} as const);
