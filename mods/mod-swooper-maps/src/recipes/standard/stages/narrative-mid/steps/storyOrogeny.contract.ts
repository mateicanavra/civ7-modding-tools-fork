import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { foundationArtifacts } from "../../foundation/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const StoryOrogenyStepContract = defineStep({
  id: "story-orogeny",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [],
  artifacts: {
    requires: [
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      narrativePreArtifacts.overlays,
    ],
  },
  schema: Type.Object({
    story: Type.Object({
      orogeny: NarrativeConfigSchema.properties.story.properties.orogeny,
    }),
  }),
});

export default StoryOrogenyStepContract;
