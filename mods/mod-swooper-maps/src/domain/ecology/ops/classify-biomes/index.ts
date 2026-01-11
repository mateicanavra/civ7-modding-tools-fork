import { createOp } from "@swooper/mapgen-core/authoring";

import BiomeClassificationContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const classifyBiomes = createOp(BiomeClassificationContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default classifyBiomes;
