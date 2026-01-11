import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planFloodplains = createOp(PlanFloodplainsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default planFloodplains;
