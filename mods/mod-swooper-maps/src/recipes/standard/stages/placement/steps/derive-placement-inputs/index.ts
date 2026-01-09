import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { publishPlacementInputs } from "./apply.js";
import { DerivePlacementInputsContract } from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;

export default createStep(DerivePlacementInputsContract, {
  normalize: (config, ctx) => ({
    wonders: placement.ops.planWonders.normalize(config.wonders, ctx),
    floodplains: placement.ops.planFloodplains.normalize(config.floodplains, ctx),
    starts: placement.ops.planStarts.normalize(config.starts, ctx),
  }),
  run: (context, config: DerivePlacementInputsConfig) => {
    const inputs = buildPlacementInputs(context, config);
    publishPlacementInputs(context, inputs);
  },
});
