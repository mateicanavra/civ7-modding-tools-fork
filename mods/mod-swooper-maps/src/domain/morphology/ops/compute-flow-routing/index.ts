import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeFlowRoutingContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeFlowRouting = createOp(ComputeFlowRoutingContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeFlowRouting;
