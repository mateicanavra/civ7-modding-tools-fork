import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Computes routing buffers (flow direction/accumulation) from current topography.
 */
const RoutingStepContract = defineStep({
  id: "routing",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [morphologyArtifacts.routing],
  },
  ops: {
    routing: morphology.ops.computeFlowRouting,
  },
  schema: Type.Object({}),
});

export default RoutingStepContract;
