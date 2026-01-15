import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeGeomorphicCycleContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeGeomorphicCycle = createOp(ComputeGeomorphicCycleContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeGeomorphicCycle;
