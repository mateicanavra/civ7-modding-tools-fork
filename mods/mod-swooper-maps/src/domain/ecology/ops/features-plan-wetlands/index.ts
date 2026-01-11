import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanWetlandsContract } from "./contract.js";
import { defaultStrategy, deltaFocusedStrategy } from "./strategies/index.js";

export const planWetlands = createOp(PlanWetlandsContract, {
  strategies: {
    default: defaultStrategy,
    "delta-focused": deltaFocusedStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default planWetlands;
