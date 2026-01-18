import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeAtmosphericCirculationContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeAtmosphericCirculation = createOp(ComputeAtmosphericCirculationContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeAtmosphericCirculation;
