import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StorySeedStepContract = defineStep({
  id: "story-seed",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [narrativePreArtifacts.overlays],
  },
  schema: Type.Object({
    margins: NarrativeConfigSchema.properties.margins,
  }),
});

export default StorySeedStepContract;
