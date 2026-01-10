import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { publishPlacementInputs } from "./apply.js";
import { DerivePlacementInputsContract } from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;

const opContracts = {
  planWonders: placement.contracts.planWonders,
  planFloodplains: placement.contracts.planFloodplains,
  planStarts: placement.contracts.planStarts,
} as const;

const { compile, runtime } = placement.ops.bind(opContracts);

export default createStep(DerivePlacementInputsContract, {
  normalize: (config, ctx) => ({
    wonders: compile.planWonders.normalize(config.wonders, ctx),
    floodplains: compile.planFloodplains.normalize(config.floodplains, ctx),
    starts: compile.planStarts.normalize(config.starts, ctx),
  }),
  run: (context, config: DerivePlacementInputsConfig) => {
    const inputs = buildPlacementInputs(context, config, runtime);
    publishPlacementInputs(context, inputs);
  },
});
