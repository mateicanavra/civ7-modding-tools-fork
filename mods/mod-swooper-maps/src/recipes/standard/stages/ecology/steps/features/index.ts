import { Type, type Static } from "typebox";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  FeaturesConfigSchema,
  FeaturesDensityConfigSchema,
  FeaturesPlacementConfigSchema,
} from "@mapgen/config";
import {
  featuresEmbellishments,
} from "@mapgen/domain/ecology/ops/features-embellishments/index.js";
import { featuresPlacement } from "@mapgen/domain/ecology/ops/features-placement/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import { buildFeaturesEmbellishmentsInput, buildFeaturesPlacementInput } from "./inputs.js";
import { applyFeaturePlacements, reifyFeatureField } from "./apply.js";

const FeaturesStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: FeaturesConfigSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: FeaturesDensityConfigSchema,
    featuresPlacement: FeaturesPlacementConfigSchema,
  },
  { additionalProperties: false, default: { story: {}, featuresDensity: {}, featuresPlacement: {} } }
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
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const { width, height } = context.dimensions;

    const placementInput = buildFeaturesPlacementInput(context);
    const placementResult = featuresPlacement.run(placementInput, config.featuresPlacement);

    if (placementResult.useEngineBaseline) {
      context.adapter.addFeatures(width, height);
    } else if (placementResult.placements.length > 0) {
      applyFeaturePlacements(context, placementResult.placements);
    }

    const embellishmentInput = buildFeaturesEmbellishmentsInput(context);
    const embellishmentResult = featuresEmbellishments.run(embellishmentInput, {
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
