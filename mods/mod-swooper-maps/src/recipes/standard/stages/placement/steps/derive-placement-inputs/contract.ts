import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import placementContracts from "@mapgen/domain/placement/contracts";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const DerivePlacementInputsContract = defineStep({
  id: "derive-placement-inputs",
  phase: "placement",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M4_EFFECT_TAGS.engine.riversModeled,
    M4_EFFECT_TAGS.engine.featuresApplied,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  ops: {
    wonders: placementContracts.planWonders,
    floodplains: placementContracts.planFloodplains,
    starts: placementContracts.planStarts,
  },
  schema: Type.Object({}),
});

export default DerivePlacementInputsContract;
