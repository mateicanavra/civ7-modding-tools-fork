import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";

export interface StoryOrogenyStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createStoryOrogenyStep(
  options: StoryOrogenyStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyOrogeny",
    phase: M3_STANDARD_STAGE_PHASE.storyOrogeny,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      storyTagOrogenyBelts(context);
    },
  };
}
