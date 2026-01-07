import { createOp } from "@swooper/mapgen-core/authoring";
import { FeaturesApplyContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const applyFeatures = createOp(FeaturesApplyContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
