import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StorySeedStepConfigSchema = Type.Object(
  {
    margins: NarrativeConfigSchema.properties.margins,
  },
  { additionalProperties: false, default: { margins: {} } }
);

export const StorySeedStepContract = defineStepContract({
  id: "storySeed",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  ],
  schema: StorySeedStepConfigSchema,
});
