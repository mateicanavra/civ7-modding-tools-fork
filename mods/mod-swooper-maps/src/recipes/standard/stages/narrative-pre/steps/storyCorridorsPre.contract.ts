import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { narrativePreArtifacts } from "../artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const StoryCorridorsPreStepContract = defineStep({
  id: "story-corridors-pre",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography, narrativePreArtifacts.overlays],
  },
  schema: Type.Object({
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default StoryCorridorsPreStepContract;
