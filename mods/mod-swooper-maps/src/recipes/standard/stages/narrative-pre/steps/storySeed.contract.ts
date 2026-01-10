import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StorySeedStepContract = defineStep({
  id: "story-seed",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  ],
  schema: Type.Object({
    margins: NarrativeConfigSchema.properties.margins,
  }),
});

export default StorySeedStepContract;
