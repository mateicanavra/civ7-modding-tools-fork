import type { ExtendedMapContext } from "../../core/types.js";
import { publishClimateFieldArtifact } from "../artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { getOrogenyCache } from "../../narrative/orogeny.js";
import { storyTagClimateSwatches } from "../../narrative/swatches.js";

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
      publishClimateFieldArtifact(context);
    },
  };
}
