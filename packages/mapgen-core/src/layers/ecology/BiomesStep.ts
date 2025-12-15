import type { ExtendedMapContext } from "../../core/types.js";
import { designateEnhancedBiomes } from "./biomes.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import {
  STORY_OVERLAY_KEYS,
  getStoryOverlay,
  hydrateCorridorsStoryTags,
  hydrateRiftsStoryTags,
} from "../../story/index.js";
import { getStoryTags } from "../../story/tags.js";

export interface BiomesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  afterRun?: (context: ExtendedMapContext) => void;
}

export function createBiomesStep(options: BiomesStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "biomes",
    phase: M3_STANDARD_STAGE_PHASE.biomes,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const storyTags = getStoryTags();
      hydrateCorridorsStoryTags(getStoryOverlay(context, STORY_OVERLAY_KEYS.CORRIDORS), storyTags);
      hydrateRiftsStoryTags(getStoryOverlay(context, STORY_OVERLAY_KEYS.RIFTS), storyTags);

      const { width, height } = context.dimensions;
      designateEnhancedBiomes(width, height, context);
      options.afterRun?.(context);
    },
  };
}
