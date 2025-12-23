import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { OrogenyTunablesSchema } from "@mapgen/config/index.js";
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

type StoryOrogenyStepConfig = Static<typeof StoryOrogenyStepConfigSchema>;

export function createStoryOrogenyStep(
  options: StoryOrogenyStepOptions
): MapGenStep<ExtendedMapContext, StoryOrogenyStepConfig> {
  return {
    id: "storyOrogeny",
    phase: M3_STANDARD_STAGE_PHASE.storyOrogeny,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryOrogenyStepConfigSchema,
    run: (context, config) => {
      storyTagOrogenyBelts(context, config.story);
    },
  };
}
