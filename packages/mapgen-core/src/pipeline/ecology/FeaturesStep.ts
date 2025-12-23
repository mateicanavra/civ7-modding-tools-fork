import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { addDiverseFeatures } from "@mapgen/domain/ecology/features/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  FeaturesConfigSchema,
  FeaturesDensityConfigSchema,
} from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
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

export function createFeaturesStep(options: FeaturesStepOptions): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "features",
    phase: M3_STANDARD_STAGE_PHASE.features,
    requires: options.requires,
    provides: options.provides,
    configSchema: FeaturesStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        hydrateMarginsStoryTags(
          getStoryOverlay(context, STORY_OVERLAY_KEYS.MARGINS),
          getStoryTags(context)
        );

        const { width, height } = context.dimensions;
        addDiverseFeatures(width, height, context);
        options.afterRun?.(context);
      });
    },
  };
}
