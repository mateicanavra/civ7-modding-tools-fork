import type { ExtendedMapContext } from "../../core/types.js";
import { DEV, devWarn } from "../../dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import { storyTagRiftValleys } from "../../story/tagging.js";

export interface StoryRiftsStepRuntime {
  logPrefix: string;
}

export interface StoryRiftsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
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
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
      const summary = storyTagRiftValleys(context);
      if (DEV.ENABLED && summary.lineTiles === 0) {
        devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
      }
    },
  };
}

