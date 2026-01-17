import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeThermalStateContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeThermalState = createOp(ComputeThermalStateContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeThermalState;
