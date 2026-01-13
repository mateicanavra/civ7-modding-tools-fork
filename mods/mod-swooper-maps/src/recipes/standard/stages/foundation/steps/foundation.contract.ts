import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { FoundationConfigSchema } from "@mapgen/domain/config";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const FoundationStepContract = defineStep({
  id: "foundation",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    provides: [
      foundationArtifacts.mesh,
      foundationArtifacts.crust,
      foundationArtifacts.plateGraph,
      foundationArtifacts.tectonics,
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      foundationArtifacts.seed,
      foundationArtifacts.diagnostics,
      foundationArtifacts.config,
    ],
  },
  ops: {
    computeMesh: foundation.ops.computeMesh,
    computeCrust: foundation.ops.computeCrust,
    computePlateGraph: foundation.ops.computePlateGraph,
    computeTectonics: foundation.ops.computeTectonics,
    computePlates: foundation.ops.computePlatesTensors,
    computeDynamics: foundation.ops.computeDynamicsTensors,
  },
  schema: Type.Object({
    foundation: FoundationConfigSchema,
  }),
});

export default FoundationStepContract;
