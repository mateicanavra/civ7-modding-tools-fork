import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import placement from "@mapgen/domain/placement";

import { M4_EFFECT_TAGS } from "../../../../tags.js";
import { placementArtifacts } from "../../artifacts.js";

const DerivePlacementInputsContract = defineStep({
  id: "derive-placement-inputs",
  phase: "placement",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M4_EFFECT_TAGS.engine.riversModeled,
    M4_EFFECT_TAGS.engine.featuresApplied,
  ],
  provides: [],
  artifacts: {
    provides: [placementArtifacts.placementInputs],
  },
  ops: {
    wonders: placement.ops.planWonders,
    floodplains: placement.ops.planFloodplains,
    starts: placement.ops.planStarts,
  },
  schema: Type.Object({}),
});

export default DerivePlacementInputsContract;
