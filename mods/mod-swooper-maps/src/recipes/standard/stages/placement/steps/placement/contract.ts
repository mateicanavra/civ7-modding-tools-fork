import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const PlacementStepContract = defineStepContract({
  id: "placement",
  phase: "placement",
  requires: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
    M4_EFFECT_TAGS.engine.placementApplied,
  ],
  schema: Type.Object({}),
});

export default PlacementStepContract;
