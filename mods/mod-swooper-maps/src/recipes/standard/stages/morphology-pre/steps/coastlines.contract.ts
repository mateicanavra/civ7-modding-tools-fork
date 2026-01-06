import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../tags.js";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export const CoastlinesStepContract = defineStepContract({
  id: "coastlines",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  schema: EmptySchema,
});
