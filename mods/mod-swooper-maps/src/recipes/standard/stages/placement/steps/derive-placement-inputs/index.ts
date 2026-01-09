import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { publishPlacementInputs } from "./apply.js";
import { DerivePlacementInputsContract } from "./contract.js";
import { buildPlacementInputs } from "./inputs.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;

const opContracts = {
  planWonders: placement.PlanWondersContract,
  planFloodplains: placement.PlanFloodplainsContract,
  planStarts: placement.PlanStartsContract,
} as const;

const compileOps = bindCompileOps(opContracts, placement.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, placement.runtimeOpsById);

export default createStep(DerivePlacementInputsContract, {
  normalize: (config, ctx) => ({
    wonders: compileOps.planWonders.normalize(config.wonders, ctx),
    floodplains: compileOps.planFloodplains.normalize(config.floodplains, ctx),
    starts: compileOps.planStarts.normalize(config.starts, ctx),
  }),
  run: (context, config: DerivePlacementInputsConfig) => {
    const inputs = buildPlacementInputs(context, config, runtimeOps);
    publishPlacementInputs(context, inputs);
  },
});
