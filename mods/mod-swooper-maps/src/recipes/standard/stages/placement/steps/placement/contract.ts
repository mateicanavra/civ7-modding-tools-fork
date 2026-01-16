import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../../tags.js";
import { placementArtifacts } from "../../artifacts.js";
import { morphologyArtifacts } from "../../../morphology-pre/artifacts.js";

const PlacementStepContract = defineStep({
  id: "placement",
  phase: "placement",
  requires: [],
  provides: [M4_EFFECT_TAGS.engine.placementApplied],
  artifacts: {
    requires: [placementArtifacts.placementInputs, morphologyArtifacts.landmasses],
    provides: [placementArtifacts.placementOutputs],
  },
  schema: Type.Object({}),
});

export default PlacementStepContract;
