import { createOp } from "@swooper/mapgen-core/authoring";
import RefineBiomeEdgesContract from "./contract.js";
import { defaultStrategy, gaussianStrategy } from "./strategies/index.js";

const refineBiomeEdges = createOp(RefineBiomeEdgesContract, {
  strategies: {
    default: defaultStrategy,
    morphological: defaultStrategy,
    gaussian: gaussianStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default refineBiomeEdges;
