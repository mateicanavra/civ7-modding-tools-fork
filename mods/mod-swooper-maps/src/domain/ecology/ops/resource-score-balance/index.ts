import { createOp } from "@swooper/mapgen-core/authoring";
import ResourceScoreBalanceContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const scoreResourceBasins = createOp(ResourceScoreBalanceContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default scoreResourceBasins;
