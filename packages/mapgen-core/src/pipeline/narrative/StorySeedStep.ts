import type { ExtendedMapContext } from "../../core/types.js";
import { DEV, devWarn } from "../../dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { resetCorridorStyleCache } from "../../narrative/corridors.js";
import { resetOrogenyCache } from "../../narrative/orogeny.js";
import { resetStoryOverlays } from "../../narrative/overlays.js";
import { storyTagContinentalMargins } from "../../narrative/tagging.js";
import { resetStoryTags } from "../../narrative/tags.js";

export interface StorySeedStepRuntime {
  logPrefix: string;
}

export interface StorySeedStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createStorySeedStep(
  runtime: StorySeedStepRuntime,
  options: StorySeedStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "storySeed",
    phase: M3_STANDARD_STAGE_PHASE.storySeed,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      resetStoryTags();
      resetStoryOverlays();
      resetOrogenyCache();
      resetCorridorStyleCache();
      console.log(`${runtime.logPrefix} Imprinting continental margins (active/passive)...`);
      const margins = storyTagContinentalMargins(context);

      if (DEV.ENABLED) {
        const activeCount = margins.active?.length ?? 0;
        const passiveCount = margins.passive?.length ?? 0;
        if (activeCount + passiveCount === 0) {
          devWarn("[smoke] storySeed enabled but margins overlay is empty");
        }
      }
    },
  };
}
