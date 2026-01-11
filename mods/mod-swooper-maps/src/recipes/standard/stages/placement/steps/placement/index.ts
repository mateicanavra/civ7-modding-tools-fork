import { createStep } from "@mapgen/authoring/steps";

import { buildPlacementPlanInput } from "./inputs.js";
import { applyPlacementPlan } from "./apply.js";
import PlacementStepContract from "./contract.js";
export default createStep(PlacementStepContract, {
  run: (context) => {
    const { starts, wonders, floodplains } = buildPlacementPlanInput(context);

    applyPlacementPlan({ context, starts, wonders, floodplains });
  },
});
