import type { ExtendedMapContext } from "../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { storyTagStrategicCorridors } from "../../narrative/corridors.js";

export interface StoryCorridorsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createStoryCorridorsPreStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyCorridorsPre",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
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
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      storyTagStrategicCorridors(context, "postRivers");
    },
  };
}
