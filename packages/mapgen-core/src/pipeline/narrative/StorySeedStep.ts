import type { ExtendedMapContext } from "../../core/types.js";
import { DEV, devWarn } from "../../dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { storyTagContinentalMargins } from "../../domain/narrative/tagging/index.js";

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
