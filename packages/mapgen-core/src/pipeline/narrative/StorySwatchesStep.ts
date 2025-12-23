import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  ClimateConfigSchema,
  FoundationDirectionalityConfigSchema,
} from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";

export interface StorySwatchesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StorySwatchesStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
    foundation: Type.Object(
      {
        dynamics: Type.Object(
          {
            directionality: FoundationDirectionalityConfigSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {}, foundation: {} } }
);

export function createStorySwatchesStep(
  options: StorySwatchesStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storySwatches",
    phase: M3_STANDARD_STAGE_PHASE.storySwatches,
    requires: options.requires,
    provides: options.provides,
    configSchema: StorySwatchesStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        storyTagClimateSwatches(context, { orogenyCache: getOrogenyCache(context) });
        publishClimateFieldArtifact(context);
      });
    },
  };
}
