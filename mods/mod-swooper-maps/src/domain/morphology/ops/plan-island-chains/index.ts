import { createOp } from "@swooper/mapgen-core/authoring";

import PlanIslandChainsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planIslandChains = createOp(PlanIslandChainsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planIslandChains;
