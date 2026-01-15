import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeBaseTopographyContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeBaseTopography = createOp(ComputeBaseTopographyContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeBaseTopography;
