import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeOceanSurfaceCurrentsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeOceanSurfaceCurrents = createOp(ComputeOceanSurfaceCurrentsContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeOceanSurfaceCurrents;
