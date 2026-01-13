import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StoryHotspotsStepContract = defineStep({
  id: "story-hotspots",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [],
  artifacts: {
    requires: [narrativePreArtifacts.overlays],
    provides: [narrativePreArtifacts.motifsHotspots],
  },
  schema: Type.Object({
    story: Type.Object({
      hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
    }),
  }),
});

export default StoryHotspotsStepContract;
