import { createOp } from "@swooper/mapgen-core/authoring";
import { RefineBiomeEdgesContract } from "./contract.js";
import { defaultStrategy, gaussianStrategy } from "./strategies/index.js";

export const refineBiomeEdges = createOp(RefineBiomeEdgesContract, {
  strategies: {
    default: defaultStrategy,
    morphological: defaultStrategy,
    gaussian: gaussianStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
