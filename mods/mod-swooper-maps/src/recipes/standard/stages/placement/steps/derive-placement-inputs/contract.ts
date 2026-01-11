import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const DerivePlacementInputsConfigSchema = Type.Object(
  {
    wonders: placement.ops.planWonders.config,
    floodplains: placement.ops.planFloodplains.config,
    starts: placement.ops.planStarts.config},
  {}
);

const DerivePlacementInputsContract = defineStepContract({
  id: "derive-placement-inputs",
  phase: "placement",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M4_EFFECT_TAGS.engine.riversModeled,
    M4_EFFECT_TAGS.engine.featuresApplied,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  schema: DerivePlacementInputsConfigSchema});

export default DerivePlacementInputsContract;
