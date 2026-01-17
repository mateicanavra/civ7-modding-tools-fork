import { createOp } from "@swooper/mapgen-core/authoring";
import AccumulateDischargeContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const accumulateDischarge = createOp(AccumulateDischargeContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default accumulateDischarge;

