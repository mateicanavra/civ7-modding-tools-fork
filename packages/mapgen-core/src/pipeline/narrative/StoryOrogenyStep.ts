import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { OrogenyTunablesSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";

export interface StoryOrogenyStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StoryOrogenyStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        orogeny: OrogenyTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {} } }
);

export function createStoryOrogenyStep(
  options: StoryOrogenyStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storyOrogeny",
    phase: M3_STANDARD_STAGE_PHASE.storyOrogeny,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryOrogenyStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        storyTagOrogenyBelts(context);
      });
    },
  };
}
