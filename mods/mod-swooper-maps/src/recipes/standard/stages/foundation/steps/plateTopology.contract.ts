import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { foundationArtifacts } from "../artifacts.js";

const PlateTopologyStepContract = defineStep({
  id: "plate-topology",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
    provides: [foundationArtifacts.plateTopology],
  },
  ops: {},
  schema: Type.Object({}, { additionalProperties: false }),
});

export default PlateTopologyStepContract;
