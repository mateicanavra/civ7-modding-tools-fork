import { createOp } from "@swooper/mapgen-core/authoring";
import PlanWetlandsContract from "./contract.js";
import { defaultStrategy, deltaFocusedStrategy } from "./strategies/index.js";

const planWetlands = createOp(PlanWetlandsContract, {
  strategies: {
    default: defaultStrategy,
    "delta-focused": deltaFocusedStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planWetlands;
