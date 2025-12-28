import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  CorridorsConfigSchema,
  FoundationDirectionalityConfigSchema,
} from "@swooper/mapgen-core/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

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

type StoryCorridorsStepConfig = Static<typeof StoryCorridorsStepConfigSchema>;

export default createStep({
  id: "storyCorridorsPre",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  ],
  schema: StoryCorridorsStepConfigSchema,
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    storyTagStrategicCorridors(context, "preIslands", {
      corridors: config.corridors,
      directionality: config.foundation?.dynamics?.directionality,
    });
  },
} as const);
