import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { addDiverseFeatures } from "@mapgen/domain/ecology/features/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  FeaturesConfigSchema,
  FeaturesDensityConfigSchema,
} from "@mapgen/config/index.js";
import { STORY_OVERLAY_KEYS, getStoryOverlay, hydrateMarginsStoryTags } from "@mapgen/domain/narrative/overlays/index.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";

export interface FeaturesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  afterRun?: (context: ExtendedMapContext) => void;
}

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

export function createFeaturesStep(options: FeaturesStepOptions): MapGenStep<ExtendedMapContext, FeaturesStepConfig> {
  return {
    id: "features",
    phase: M3_STANDARD_STAGE_PHASE.features,
    requires: options.requires,
    provides: options.provides,
    configSchema: FeaturesStepConfigSchema,
    run: (context, config) => {
      hydrateMarginsStoryTags(
        getStoryOverlay(context, STORY_OVERLAY_KEYS.MARGINS),
        getStoryTags(context)
      );

      const { width, height } = context.dimensions;
      addDiverseFeatures(width, height, context, {
        story: config.story,
        featuresDensity: config.featuresDensity,
      });
      reifyFeatureField(context);
      options.afterRun?.(context);
    },
  };
}
