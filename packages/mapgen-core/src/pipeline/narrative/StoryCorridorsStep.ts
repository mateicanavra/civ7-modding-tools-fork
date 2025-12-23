import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  CorridorsConfigSchema,
  FoundationDirectionalityConfigSchema,
} from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";

export interface StoryCorridorsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StoryCorridorsStepConfigSchema = Type.Object(
  {
    corridors: CorridorsConfigSchema,
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
  { additionalProperties: false, default: { corridors: {}, foundation: {} } }
);

export function createStoryCorridorsPreStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storyCorridorsPre",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryCorridorsStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        storyTagStrategicCorridors(context, "preIslands");
      });
    },
  };
}

export function createStoryCorridorsPostStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "storyCorridorsPost",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPost,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryCorridorsStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        storyTagStrategicCorridors(context, "postRivers");
      });
    },
  };
}
