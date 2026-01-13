import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StoryCorridorsPreStepContract = defineStep({
  id: "story-corridors-pre",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [],
  artifacts: {
    requires: [
      narrativePreArtifacts.overlays,
      narrativePreArtifacts.motifsHotspots,
      narrativePreArtifacts.motifsRifts,
    ],
    provides: [narrativePreArtifacts.corridors],
  },
  schema: Type.Object({
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default StoryCorridorsPreStepContract;
