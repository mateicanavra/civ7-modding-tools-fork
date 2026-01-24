import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * Plans island chain edits (coastal and volcanic accents).
 */
const IslandsStepContract = defineStep({
  id: "islands",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.plates, morphologyArtifacts.topography],
  },
  ops: {
    islands: morphology.ops.planIslandChains,
  },
  schema: Type.Object({}),
});

export default IslandsStepContract;
