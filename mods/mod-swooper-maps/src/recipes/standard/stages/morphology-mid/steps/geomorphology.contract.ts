import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Applies geomorphic cycle deltas to elevation and sediment buffers.
 */
const GeomorphologyStepContract = defineStep({
  id: "geomorphology",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      morphologyArtifacts.topography,
      morphologyArtifacts.routing,
      morphologyArtifacts.substrate,
    ],
  },
  ops: {
    geomorphology: morphology.ops.computeGeomorphicCycle,
  },
  schema: Type.Object({}),
});

export default GeomorphologyStepContract;
