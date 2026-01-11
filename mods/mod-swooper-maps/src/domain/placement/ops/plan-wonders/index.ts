import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanWondersContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planWonders = createOp(PlanWondersContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default planWonders;
