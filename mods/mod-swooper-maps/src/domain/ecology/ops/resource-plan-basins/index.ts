import { createOp } from "@swooper/mapgen-core/authoring";
import ResourcePlanBasinsContract from "./contract.js";
import { defaultStrategy, hydroFluvialStrategy, mixedStrategy } from "./strategies/index.js";

const planResourceBasins = createOp(ResourcePlanBasinsContract, {
  strategies: {
    default: defaultStrategy,
    "hydro-fluvial": hydroFluvialStrategy,
    mixed: mixedStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planResourceBasins;
