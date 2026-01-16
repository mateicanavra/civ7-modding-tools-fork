import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeSeaLevelContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeSeaLevel = createOp(ComputeSeaLevelContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeSeaLevel;
