import { createOp } from "@swooper/mapgen-core/authoring";
import { ResourceScoreBalanceContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const scoreResourceBasins = createOp(ResourceScoreBalanceContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default scoreResourceBasins;
