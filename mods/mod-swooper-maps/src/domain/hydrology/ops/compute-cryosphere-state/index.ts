import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeCryosphereStateContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeCryosphereState = createOp(ComputeCryosphereStateContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeCryosphereState;
