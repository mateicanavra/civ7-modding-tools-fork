import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const LakesStepContract = defineStepContract({
  id: "lakes",
  phase: "hydrology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  schema: Type.Object({}),
});

export default LakesStepContract;
