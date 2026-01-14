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
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      foundationArtifacts.seed,
      foundationArtifacts.diagnostics,
      foundationArtifacts.config,
    ],
  },
  ops: {
    computePlates: foundation.ops.computePlatesTensors,
    computeDynamics: foundation.ops.computeDynamicsTensors,
  },
  schema: Type.Object({
    foundation: FoundationConfigSchema,
  }),
});

export default FoundationStepContract;
