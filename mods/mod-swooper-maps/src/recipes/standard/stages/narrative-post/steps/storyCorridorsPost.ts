import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { getPublishedNarrativeCorridors } from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryCorridorsStepConfigSchema = Type.Object(
  {
    corridors: NarrativeConfigSchema.properties.corridors,
  },
  { additionalProperties: false, default: { corridors: {} } }
);

type StoryCorridorsStepConfig = Static<typeof StoryCorridorsStepConfigSchema>;

export default createStep({
  id: "storyCorridorsPost",
  phase: "hydrology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  ],
  schema: StoryCorridorsStepConfigSchema,
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    const directionality =
      context.settings.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing settings.directionality.");
    }
    const corridors = getPublishedNarrativeCorridors(context);
    if (!corridors) {
      throw new Error("[Narrative] Missing artifact:narrative.corridors@v1.");
    }
    const result = storyTagStrategicCorridors(
      context,
      "postRivers",
      {
        corridors: config.corridors,
        directionality,
      },
      { corridors }
    );
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      result.corridors
    );
  },
} as const);
