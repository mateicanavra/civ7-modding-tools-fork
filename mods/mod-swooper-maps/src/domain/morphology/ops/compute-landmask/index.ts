import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeLandmaskContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeLandmask = createOp(ComputeLandmaskContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeLandmask;
