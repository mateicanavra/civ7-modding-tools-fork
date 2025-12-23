import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, devWarn } from "@mapgen/dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { ContinentalMarginsConfigSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";

export interface StorySeedStepRuntime {
  logPrefix: string;
}

export interface StorySeedStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StorySeedStepConfigSchema = Type.Object(
  {
    margins: ContinentalMarginsConfigSchema,
  },
  { additionalProperties: false, default: { margins: {} } }
);

export function createStorySeedStep(
  runtime: StorySeedStepRuntime,
  options: StorySeedStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storySeed",
    phase: M3_STANDARD_STAGE_PHASE.storySeed,
    requires: options.requires,
    provides: options.provides,
    configSchema: StorySeedStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        console.log(`${runtime.logPrefix} Imprinting continental margins (active/passive)...`);
        const margins = storyTagContinentalMargins(context);

        if (DEV.ENABLED) {
          const activeCount = margins.active?.length ?? 0;
          const passiveCount = margins.passive?.length ?? 0;
          if (activeCount + passiveCount === 0) {
            devWarn("[smoke] storySeed enabled but margins overlay is empty");
          }
        }
      });
    },
  };
}
