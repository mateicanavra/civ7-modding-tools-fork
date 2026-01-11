import { createOp } from "@swooper/mapgen-core/authoring";
import { AggregatePedologyContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const aggregatePedology = createOp(AggregatePedologyContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default aggregatePedology;
