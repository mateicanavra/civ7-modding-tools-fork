import { createOp } from "@swooper/mapgen-core/authoring";

import PlanStartsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planStarts = createOp(PlanStartsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planStarts;
