import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryOrogenyStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        orogeny: NarrativeConfigSchema.properties.story.properties.orogeny,
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

export const StoryOrogenyStepContract = defineStepContract({
  id: "story-orogeny",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
  ],
  schema: StoryOrogenyStepConfigSchema,
});
