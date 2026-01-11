import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanStartsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planStarts = createOp(PlanStartsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default planStarts;
