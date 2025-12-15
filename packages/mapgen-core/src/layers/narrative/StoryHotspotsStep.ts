import type { ExtendedMapContext } from "../../core/types.js";
import { DEV, devWarn } from "../../dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import { storyTagHotspotTrails } from "../../narrative/tagging.js";

export interface StoryHotspotsStepRuntime {
  logPrefix: string;
}

export interface StoryHotspotsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createStoryHotspotsStep(
  runtime: StoryHotspotsStepRuntime,
  options: StoryHotspotsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storyHotspots",
    phase: M3_STANDARD_STAGE_PHASE.storyHotspots,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      console.log(`${runtime.logPrefix} Imprinting hotspot trails...`);
      const summary = storyTagHotspotTrails(context);
      if (DEV.ENABLED && summary.points === 0) {
        devWarn("[smoke] storyHotspots enabled but no hotspot points were emitted");
      }
    },
  };
}
