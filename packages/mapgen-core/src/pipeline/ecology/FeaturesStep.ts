import type { ExtendedMapContext } from "../../core/types.js";
import { addDiverseFeatures } from "../../domain/ecology/features/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { STORY_OVERLAY_KEYS, getStoryOverlay, hydrateMarginsStoryTags } from "../../story/index.js";
import { getStoryTags } from "../../story/tags.js";

export interface FeaturesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  afterRun?: (context: ExtendedMapContext) => void;
}

export function createFeaturesStep(options: FeaturesStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "features",
    phase: M3_STANDARD_STAGE_PHASE.features,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      hydrateMarginsStoryTags(getStoryOverlay(context, STORY_OVERLAY_KEYS.MARGINS), getStoryTags());

      const { width, height } = context.dimensions;
      addDiverseFeatures(width, height, context);
      options.afterRun?.(context);
    },
  };
}
