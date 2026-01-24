import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";

/**
 * Plans and applies volcanic placements.
 */
const VolcanoesStepContract = defineStep({
  id: "volcanoes",
  phase: "morphology",
  requires: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
  },
  provides: [],
  ops: {
    volcanoes: morphology.ops.planVolcanoes,
  },
  schema: Type.Object({}),
});

export default VolcanoesStepContract;
