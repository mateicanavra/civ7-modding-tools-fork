import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeLandmassesContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeLandmasses = createOp(ComputeLandmassesContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeLandmasses;
