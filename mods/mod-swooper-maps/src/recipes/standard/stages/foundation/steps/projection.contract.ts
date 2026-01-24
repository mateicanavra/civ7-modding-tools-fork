import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import foundation from "@mapgen/domain/foundation";

import { foundationArtifacts } from "../artifacts.js";

const ProjectionStepContract = defineStep({
  id: "projection",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      foundationArtifacts.mesh,
      foundationArtifacts.crust,
      foundationArtifacts.plateGraph,
      foundationArtifacts.tectonics,
    ],
    provides: [foundationArtifacts.plates, foundationArtifacts.tileToCellIndex, foundationArtifacts.crustTiles],
  },
  ops: {
    computePlates: foundation.ops.computePlatesTensors,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default ProjectionStepContract;
