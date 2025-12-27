<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts
import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { publishClimateFieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import {
  ClimateConfigSchema,
} from "@mapgen/config/index.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";

export interface StorySwatchesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StorySwatchesStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
  },
  { additionalProperties: false, default: { climate: {} } }
);

type StorySwatchesStepConfig = Static<typeof StorySwatchesStepConfigSchema>;

export function createStorySwatchesStep(
  options: StorySwatchesStepOptions
): MapGenStep<ExtendedMapContext, StorySwatchesStepConfig> {
  return {
    id: "storySwatches",
    phase: M3_STANDARD_STAGE_PHASE.storySwatches,
    requires: options.requires,
    provides: options.provides,
    configSchema: StorySwatchesStepConfigSchema,
    run: (context, config) => {
      storyTagClimateSwatches(context, {
        orogenyCache: getOrogenyCache(context),
        climate: config.climate,
        directionality: context.config.foundation?.dynamics?.directionality,
      });
      publishClimateFieldArtifact(context);
    },
  };
}
========
export * from "@mapgen/base/pipeline/narrative/StorySwatchesStep.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/narrative/StorySwatchesStep.ts
