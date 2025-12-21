import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";

export interface StoryCorridorsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createStoryCorridorsPreStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyCorridorsPre",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      storyTagStrategicCorridors(context, "preIslands");
    },
  };
}

export function createStoryCorridorsPostStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyCorridorsPost",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPost,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      storyTagStrategicCorridors(context, "postRivers");
    },
  };
}
