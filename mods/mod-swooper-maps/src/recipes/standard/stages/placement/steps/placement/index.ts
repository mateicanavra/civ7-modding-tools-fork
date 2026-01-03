import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";

import { buildPlacementPlanInput } from "./inputs.js";
import { applyPlacementPlan } from "./apply.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "placement",
  phase: "placement",
  requires: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
    M4_EFFECT_TAGS.engine.placementApplied,
  ],
  schema: EmptySchema,
  run: (context) => {
    const { starts, wonders, floodplains } = buildPlacementPlanInput(context);

    applyPlacementPlan({ context, starts, wonders, floodplains });
  },
} as const);
