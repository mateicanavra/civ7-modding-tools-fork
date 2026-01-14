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
    provides: [foundationArtifacts.tectonics],
  },
  ops: {
    computeTectonics: foundation.ops.computeTectonics,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default TectonicsStepContract;
