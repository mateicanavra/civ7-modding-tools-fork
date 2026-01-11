import { createStep } from "@mapgen/authoring/steps";

import { publishPlacementInputs } from "./apply.js";
import DerivePlacementInputsContract from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";

export default createStep(DerivePlacementInputsContract, {
  run: (context, config, ops) => {
    const inputs = buildPlacementInputs(context, config, ops);
    publishPlacementInputs(context, inputs);
  },
});
