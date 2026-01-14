import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import { buildPlacementPlanInput } from "./inputs.js";
import { applyPlacementPlan } from "./apply.js";
import PlacementStepContract from "./contract.js";
import { placementArtifacts } from "../../artifacts.js";
export default createStep(PlacementStepContract, {
  artifacts: implementArtifacts([placementArtifacts.placementOutputs], {
    placementOutputs: {},
  }),
  run: (context, _config, _ops, deps) => {
    const placementInputs = deps.artifacts.placementInputs.read(context);
    const landmasses = deps.artifacts.landmasses.read(context);
    const { starts, wonders, floodplains } = buildPlacementPlanInput(placementInputs);

    applyPlacementPlan({
      context,
      landmasses,
      landmassRegions: placementInputs.placementConfig.landmassRegions,
      starts,
      wonders,
      floodplains,
      publishOutputs: (outputs) =>
        deps.artifacts.placementOutputs.publish(context, outputs),
    });
  },
});
