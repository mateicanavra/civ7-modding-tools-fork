import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const RuggedCoastsStepConfigSchema = Type.Object(
  {
    coastlines: MorphologyConfigSchema.properties.coastlines,
    corridors: NarrativeConfigSchema.properties.corridors,
  },
  { additionalProperties: false }
);

export const RuggedCoastsStepContract = defineStepContract({
  id: "rugged-coasts",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  ],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  schema: RuggedCoastsStepConfigSchema,
});

export default RuggedCoastsStepContract;
