import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyPreArtifacts } from "../artifacts.js";

const LakesStepContract = defineStep({
  id: "lakes",
  phase: "hydrology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [],
  artifacts: {
    provides: [hydrologyPreArtifacts.heightfield],
  },
  schema: Type.Object({}),
});

export default LakesStepContract;
