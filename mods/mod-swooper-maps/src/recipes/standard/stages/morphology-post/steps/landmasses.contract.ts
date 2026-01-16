import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Publishes the landmass decomposition artifact from the final land mask.
 */
const LandmassesStepContract = defineStep({
  id: "landmasses",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [morphologyArtifacts.landmasses],
  },
  ops: {
    landmasses: morphology.ops.computeLandmasses,
  },
  schema: Type.Object({}),
});

export default LandmassesStepContract;
