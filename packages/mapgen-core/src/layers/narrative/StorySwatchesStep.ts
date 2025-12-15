import type { ExtendedMapContext } from "../../core/types.js";
import { publishClimateFieldArtifact } from "../../pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import { getOrogenyCache } from "../../story/orogeny.js";
import { storyTagClimatePaleo, storyTagClimateSwatches } from "../../story/swatches.js";

export interface StorySwatchesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createStorySwatchesStep(
  options: StorySwatchesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storySwatches",
    phase: M3_STANDARD_STAGE_PHASE.storySwatches,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      storyTagClimateSwatches(context, { orogenyCache: getOrogenyCache() });
      if (context?.config?.toggles?.STORY_ENABLE_PALEO) {
        storyTagClimatePaleo(context);
      }
      publishClimateFieldArtifact(context);
    },
  };
}

