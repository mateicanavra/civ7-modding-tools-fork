<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts
import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, devWarn } from "@mapgen/dev/index.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/engine/index.js";
import {
  RiftTunablesSchema,
} from "@mapgen/config/index.js";
import { storyTagRiftValleys } from "@mapgen-content/narrative/tagging/index.js";

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
  },
  { additionalProperties: false, default: { story: {} } }
);

type StoryRiftsStepConfig = Static<typeof StoryRiftsStepConfigSchema>;

export function createStoryRiftsStep(
  runtime: StoryRiftsStepRuntime,
  options: StoryRiftsStepOptions
): MapGenStep<ExtendedMapContext, StoryRiftsStepConfig> {
  return {
    id: "storyRifts",
    phase: M3_STANDARD_STAGE_PHASE.storyRifts,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryRiftsStepConfigSchema,
    run: (context, config) => {
      console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
      const summary = storyTagRiftValleys(context, {
        story: config.story,
      });
      if (DEV.ENABLED && summary.lineTiles === 0) {
        devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
      }
    },
  };
}
========
export * from "@mapgen/base/pipeline/narrative/StoryRiftsStep.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/narrative/StoryRiftsStep.ts
