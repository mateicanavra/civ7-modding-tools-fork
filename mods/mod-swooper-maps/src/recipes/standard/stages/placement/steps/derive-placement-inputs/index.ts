import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import DerivePlacementInputsContract from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";
import { placementArtifacts } from "../../artifacts.js";

export default createStep(DerivePlacementInputsContract, {
  artifacts: implementArtifacts([placementArtifacts.placementInputs], {
    placementInputs: {},
  }),
  run: (context, config, ops, deps) => {
    const inputs = buildPlacementInputs(context, config, ops);
    deps.artifacts.placementInputs.publish(context, inputs);
  },
});
