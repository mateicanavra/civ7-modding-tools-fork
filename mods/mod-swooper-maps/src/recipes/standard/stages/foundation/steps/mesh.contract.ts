import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const MeshStepContract = defineStep({
  id: "mesh",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    provides: [foundationArtifacts.mesh],
  },
  ops: {
    computeMesh: foundation.ops.computeMesh,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default MeshStepContract;
