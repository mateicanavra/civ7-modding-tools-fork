import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryCorridorsStepConfigSchema = Type.Object(
  {
    corridors: NarrativeConfigSchema.properties.corridors,
  },
  { additionalProperties: false }
);

const StoryCorridorsPreStepContract = defineStepContract({
  id: "story-corridors-pre",
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
});

export default StoryCorridorsPreStepContract;
