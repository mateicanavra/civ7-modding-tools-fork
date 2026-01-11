import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryCorridorsStepConfigSchema = Type.Object(
  {
    corridors: NarrativeConfigSchema.properties.corridors,
  },
  { additionalProperties: false }
);

export const StoryCorridorsPostStepContract = defineStepContract({
  id: "story-corridors-post",
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
});

export default StoryCorridorsPostStepContract;
