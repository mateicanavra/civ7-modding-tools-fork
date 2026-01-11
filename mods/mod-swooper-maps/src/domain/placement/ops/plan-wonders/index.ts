import { createOp } from "@swooper/mapgen-core/authoring";

import PlanWondersContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planWonders = createOp(PlanWondersContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planWonders;
