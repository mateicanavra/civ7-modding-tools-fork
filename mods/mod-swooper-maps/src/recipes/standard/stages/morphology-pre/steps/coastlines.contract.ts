import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { morphologyArtifacts } from "../artifacts.js";

const CoastlinesStepContract = defineStep({
  id: "coastlines",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [morphologyArtifacts.coastlinesApplied],
  },
  schema: Type.Object({}),
});

export default CoastlinesStepContract;
