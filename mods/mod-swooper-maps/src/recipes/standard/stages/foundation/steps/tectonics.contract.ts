import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const TectonicsStepContract = defineStep({
  id: "tectonics",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.mesh, foundationArtifacts.crust, foundationArtifacts.plateGraph],
    provides: [foundationArtifacts.tectonicSegments, foundationArtifacts.tectonicHistory, foundationArtifacts.tectonics],
  },
  ops: {
    computeTectonicSegments: foundation.ops.computeTectonicSegments,
    computeTectonicHistory: foundation.ops.computeTectonicHistory,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default TectonicsStepContract;
