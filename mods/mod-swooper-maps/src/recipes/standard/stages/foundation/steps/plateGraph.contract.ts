import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const PlateGraphStepContract = defineStep({
  id: "plate-graph",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.mesh, foundationArtifacts.crust],
    provides: [foundationArtifacts.plateGraph],
  },
  ops: {
    computePlateGraph: foundation.ops.computePlateGraph,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default PlateGraphStepContract;
