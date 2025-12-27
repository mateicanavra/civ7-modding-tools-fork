import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import {
  ClimateConfigSchema,
  FoundationDirectionalityConfigSchema,
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
        directionality: config.foundation?.dynamics?.directionality,
      });
      publishClimateFieldArtifact(context);
    },
  };
}
