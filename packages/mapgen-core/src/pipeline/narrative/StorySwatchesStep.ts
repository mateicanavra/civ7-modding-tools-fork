import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";

export interface StorySwatchesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createStorySwatchesStep(
  options: StorySwatchesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storySwatches",
    phase: M3_STANDARD_STAGE_PHASE.storySwatches,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      storyTagClimateSwatches(context, { orogenyCache: getOrogenyCache(context) });
      publishClimateFieldArtifact(context);
    },
  };
}
