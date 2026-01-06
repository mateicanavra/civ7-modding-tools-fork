import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { publishPlacementInputs } from "./apply.js";
import { DerivePlacementInputsContract } from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;

export default createStep(DerivePlacementInputsContract, {
  resolveConfig: (config, settings) => ({
    wonders: placement.ops.planWonders.resolveConfig(config.wonders, settings),
    floodplains: placement.ops.planFloodplains.resolveConfig(config.floodplains, settings),
    starts: placement.ops.planStarts.resolveConfig(config.starts, settings),
  }),
  run: (context, config: DerivePlacementInputsConfig) => {
    const inputs = buildPlacementInputs(context, config);
    publishPlacementInputs(context, inputs);
  },
});
