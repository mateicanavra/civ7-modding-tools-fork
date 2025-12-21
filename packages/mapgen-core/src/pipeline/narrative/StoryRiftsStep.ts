import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, devWarn } from "@mapgen/dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";

export interface StoryRiftsStepRuntime {
  logPrefix: string;
}

export interface StoryRiftsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createStoryRiftsStep(
  runtime: StoryRiftsStepRuntime,
  options: StoryRiftsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyRifts",
    phase: M3_STANDARD_STAGE_PHASE.storyRifts,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
      const summary = storyTagRiftValleys(context);
      if (DEV.ENABLED && summary.lineTiles === 0) {
        devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
      }
    },
  };
}
