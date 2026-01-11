import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryHotspotsStepContract = defineStep({
  id: "story-hotspots",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  schema: Type.Object({
    story: Type.Object({
      hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
    }),
  }),
});

export default StoryHotspotsStepContract;
