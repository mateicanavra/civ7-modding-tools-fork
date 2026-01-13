import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { narrativePreArtifacts } from "../artifacts.js";

const StorySeedStepContract = defineStep({
  id: "story-seed",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [],
  artifacts: {
    provides: [narrativePreArtifacts.overlays],
  },
  schema: Type.Object({
    margins: NarrativeConfigSchema.properties.margins,
  }),
});

export default StorySeedStepContract;
