import { createOp } from "@swooper/mapgen-core/authoring";
import ComputePrecipitationContract from "./contract.js";
import { defaultStrategy, refineStrategy } from "./strategies/index.js";

const computePrecipitation = createOp(ComputePrecipitationContract, {
  strategies: {
    default: defaultStrategy,
    refine: refineStrategy,
  },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computePrecipitation;
