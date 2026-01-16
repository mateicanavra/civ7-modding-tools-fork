import { createOp } from "@swooper/mapgen-core/authoring";

import PlanRidgesAndFoothillsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planRidgesAndFoothills = createOp(PlanRidgesAndFoothillsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planRidgesAndFoothills;
