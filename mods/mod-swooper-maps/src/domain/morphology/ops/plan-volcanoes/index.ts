import { createOp } from "@swooper/mapgen-core/authoring";

import PlanVolcanoesContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planVolcanoes = createOp(PlanVolcanoesContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planVolcanoes;
