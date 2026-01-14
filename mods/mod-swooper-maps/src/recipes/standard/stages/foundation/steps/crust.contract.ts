import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const CrustStepContract = defineStep({
  id: "crust",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.mesh],
    provides: [foundationArtifacts.crust],
  },
  ops: {
    computeCrust: foundation.ops.computeCrust,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default CrustStepContract;
