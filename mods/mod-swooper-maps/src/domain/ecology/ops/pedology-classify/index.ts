import { createOp } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "./contract.js";
import {
  coastalShelfStrategy,
  defaultStrategy,
  orogenyBoostedStrategy,
} from "./strategies/index.js";

export const classifyPedology = createOp(PedologyClassifyContract, {
  strategies: {
    default: defaultStrategy,
    "coastal-shelf": coastalShelfStrategy,
    "orogeny-boosted": orogenyBoostedStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default classifyPedology;
