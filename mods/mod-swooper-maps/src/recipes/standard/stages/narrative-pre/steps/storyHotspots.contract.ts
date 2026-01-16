import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StoryHotspotsStepContract = defineStep({
  id: "story-hotspots",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography, narrativePreArtifacts.overlays],
  },
  schema: Type.Object({
    story: Type.Object({
      hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
    }),
  }),
});

export default StoryHotspotsStepContract;
