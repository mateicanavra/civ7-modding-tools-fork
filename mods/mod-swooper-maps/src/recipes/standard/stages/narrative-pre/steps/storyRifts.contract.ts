import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { foundationArtifacts } from "../../foundation/artifacts.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StoryRiftsStepContract = defineStep({
  id: "story-rifts",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.plates, narrativePreArtifacts.overlays],
    provides: [narrativePreArtifacts.motifsRifts],
  },
  schema: Type.Object({
    story: Type.Object({
      rift: NarrativeConfigSchema.properties.story.properties.rift,
    }),
  }),
});

export default StoryRiftsStepContract;
