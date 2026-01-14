import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const StoryOrogenyStepContract = defineStep({
  id: "story-orogeny",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      morphologyArtifacts.topography,
      foundationArtifacts.plates,
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
