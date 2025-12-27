import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { CorridorsConfigSchema } from "@mapgen/config/index.js";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";

export interface StoryCorridorsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const StoryCorridorsStepConfigSchema = Type.Object(
  {
    corridors: CorridorsConfigSchema,
  },
  { additionalProperties: false, default: { corridors: {} } }
);

type StoryCorridorsStepConfig = Static<typeof StoryCorridorsStepConfigSchema>;

export function createStoryCorridorsPreStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext, StoryCorridorsStepConfig> {
  return {
    id: "storyCorridorsPre",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryCorridorsStepConfigSchema,
    run: (context, config) => {
      storyTagStrategicCorridors(context, "preIslands", {
        corridors: config.corridors,
        directionality: context.config.foundation?.dynamics?.directionality,
      });
    },
  };
}

export function createStoryCorridorsPostStep(
  options: StoryCorridorsStepOptions
): MapGenStep<ExtendedMapContext, StoryCorridorsStepConfig> {
  return {
    id: "storyCorridorsPost",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPost,
    requires: options.requires,
    provides: options.provides,
    configSchema: StoryCorridorsStepConfigSchema,
    run: (context, config) => {
      storyTagStrategicCorridors(context, "postRivers", {
        corridors: config.corridors,
        directionality: context.config.foundation?.dynamics?.directionality,
      });
    },
  };
}
