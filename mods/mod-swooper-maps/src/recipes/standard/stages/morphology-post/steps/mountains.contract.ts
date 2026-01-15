import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";

const MountainsStepContract = defineStep({
  id: "mountains",
  phase: "morphology",
  requires: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
  },
  provides: [],
  ops: {
    mountains: morphology.ops.planRidgesAndFoothills,
  },
  schema: Type.Object({}),
});

export default MountainsStepContract;
