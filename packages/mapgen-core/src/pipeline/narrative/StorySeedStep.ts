import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, devWarn } from "@mapgen/dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";

export interface StorySeedStepRuntime {
  logPrefix: string;
}

export interface StorySeedStepOptions {
  requires: readonly string[];
  provides: readonly string[];
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
    run: (context) => {
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
