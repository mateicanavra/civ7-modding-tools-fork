import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import DerivePlacementInputsContract from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";
import { placementArtifacts } from "../../artifacts.js";

export default createStep(DerivePlacementInputsContract, {
  artifacts: implementArtifacts([placementArtifacts.placementInputs], {
    placementInputs: {},
  }),
  run: (context, config, ops, deps) => {
    const landmasses = deps.artifacts.landmasses.read(context);
    const inputs = buildPlacementInputs(context, config, ops, landmasses);
    deps.artifacts.placementInputs.publish(context, inputs);
  },
});
