import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

/**
 * Plans island chain edits (coastal and volcanic accents).
 */
const IslandsStepContract = defineStep({
  id: "islands",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [narrativePreArtifacts.overlays],
  },
  ops: {
    islands: morphology.ops.planIslandChains,
  },
  schema: Type.Object({}),
});

export default IslandsStepContract;
