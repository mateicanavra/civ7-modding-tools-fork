import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { narrativePreArtifacts } from "../artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const StoryRiftsStepContract = defineStep({
  id: "story-rifts",
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
      rift: NarrativeConfigSchema.properties.story.properties.rift,
    }),
  }),
});

export default StoryRiftsStepContract;
