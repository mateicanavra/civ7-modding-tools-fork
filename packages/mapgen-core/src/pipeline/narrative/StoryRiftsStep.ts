import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, devWarn } from "@mapgen/dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  FoundationDirectionalityConfigSchema,
  RiftTunablesSchema,
} from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";

export interface StoryRiftsStepRuntime {
  logPrefix: string;
}

export interface StoryRiftsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StoryRiftsStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        rift: RiftTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    foundation: Type.Object(
      {
        dynamics: Type.Object(
          {
            directionality: FoundationDirectionalityConfigSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {}, foundation: {} } }
);

export function createStoryRiftsStep(
  runtime: StoryRiftsStepRuntime,
  options: StoryRiftsStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storyRifts",
    phase: M3_STANDARD_STAGE_PHASE.storyRifts,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryRiftsStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
        const summary = storyTagRiftValleys(context);
        if (DEV.ENABLED && summary.lineTiles === 0) {
          devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
        }
      });
    },
  };
}
