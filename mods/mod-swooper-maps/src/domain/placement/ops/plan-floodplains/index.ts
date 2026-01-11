import { createOp } from "@swooper/mapgen-core/authoring";

import PlanFloodplainsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planFloodplains = createOp(PlanFloodplainsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planFloodplains;
