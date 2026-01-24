import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Plans volcanic placements (truth-only intent).
 */
const VolcanoesStepContract = defineStep({
  id: "volcanoes",
  phase: "morphology",
  requires: [],
  artifacts: {
    requires: [foundationArtifacts.plates, morphologyArtifacts.topography],
    provides: [morphologyArtifacts.volcanoes],
  },
  provides: [],
  ops: {
    volcanoes: morphology.ops.planVolcanoes,
  },
  schema: Type.Object({}),
});

export default VolcanoesStepContract;
