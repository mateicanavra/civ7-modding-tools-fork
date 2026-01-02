import { Type, type Static } from "typebox";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "@mapgen/config";
import { addDiverseFeatures } from "@mapgen/domain/ecology/features/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";
import { getPublishedBiomeClassification } from "../../../artifacts.js";

const FeaturesStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: FeaturesConfigSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: FeaturesDensityConfigSchema,
  },
  { additionalProperties: false, default: { story: {}, featuresDensity: {} } }
);

type FeaturesStepConfig = Static<typeof FeaturesStepConfigSchema>;

function reifyFeatureField(context: ExtendedMapContext): void {
  const featureTypeField = context.fields?.featureType;
  if (!featureTypeField) {
    throw new Error("FeaturesStep: Missing field:featureType buffer for reification.");
  }

  const { width, height } = context.dimensions;
  const { adapter } = context;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      featureTypeField[rowOffset + x] = adapter.getFeatureType(x, y) | 0;
    }
  }
}

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
    const classification = getPublishedBiomeClassification(context);
    if (!classification) {
      throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
    }
    addDiverseFeatures(width, height, context, {
      story: config.story,
      featuresDensity: config.featuresDensity,
    });
    reifyFeatureField(context);
    context.adapter.validateAndFixTerrain();
    syncHeightfield(context);
    context.adapter.recalculateAreas();
  },
} as const);
