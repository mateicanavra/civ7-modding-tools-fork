import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Produces coastline metrics and applies ruggedization adjustments.
 */
const RuggedCoastsStepContract = defineStep({
  id: "rugged-coasts",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
    provides: [morphologyArtifacts.coastlineMetrics],
  },
  ops: {
    coastlines: morphology.ops.computeCoastlineMetrics,
  },
  schema: Type.Object({}),
});

export default RuggedCoastsStepContract;
