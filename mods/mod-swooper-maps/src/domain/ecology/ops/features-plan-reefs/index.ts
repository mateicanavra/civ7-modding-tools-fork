import { createOp } from "@swooper/mapgen-core/authoring";
import PlanReefsContract from "./contract.js";
import { defaultStrategy, shippingLanesStrategy } from "./strategies/index.js";

const planReefs = createOp(PlanReefsContract, {
  strategies: {
    default: defaultStrategy,
    "shipping-lanes": shippingLanesStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planReefs;
