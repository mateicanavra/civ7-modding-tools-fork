import { createOp } from "@swooper/mapgen-core/authoring";

import { biomeSymbolFromIndex, type BiomeSymbol } from "../../types.js";
import { BiomeClassificationContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const classifyBiomes = createOp(BiomeClassificationContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export function biomeSymbolAt(index: number): BiomeSymbol {
  return biomeSymbolFromIndex(index);
}

export { biomeSymbolFromIndex };
