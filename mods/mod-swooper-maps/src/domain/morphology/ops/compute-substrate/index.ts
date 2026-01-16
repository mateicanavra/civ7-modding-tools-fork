import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeSubstrateContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeSubstrate = createOp(ComputeSubstrateContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeSubstrate;
