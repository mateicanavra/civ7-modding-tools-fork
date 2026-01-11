import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../tags.js";

const CoastlinesStepContract = defineStepContract({
  id: "coastlines",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  schema: Type.Object({}),
});

export default CoastlinesStepContract;
