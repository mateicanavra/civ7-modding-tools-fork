import type { ExtendedMapContext } from "../core/types.js";
import { designateEnhancedBiomes } from "../layers/ecology/biomes.js";
import type { MapGenStep } from "../pipeline/types.js";
import { getStoryOverlay, STORY_OVERLAY_KEYS, hydrateCorridorsStoryTags, hydrateRiftsStoryTags } from "../story/index.js";
import { getStoryTags } from "../story/tags.js";

export interface LegacyBiomesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  afterRun?: (context: ExtendedMapContext) => void;
}

export function createLegacyBiomesStep(
  options: LegacyBiomesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "biomes",
    phase: "ecology",
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const storyTags = getStoryTags();
      hydrateCorridorsStoryTags(
        getStoryOverlay(context, STORY_OVERLAY_KEYS.CORRIDORS),
        storyTags
      );
      hydrateRiftsStoryTags(
        getStoryOverlay(context, STORY_OVERLAY_KEYS.RIFTS),
        storyTags
      );

      const { width, height } = context.dimensions;
      designateEnhancedBiomes(width, height, context);
      options.afterRun?.(context);
    },
  };
}
