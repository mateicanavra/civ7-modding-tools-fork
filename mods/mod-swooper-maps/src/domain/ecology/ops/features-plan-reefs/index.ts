import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanReefsContract } from "./contract.js";
import { defaultStrategy, shippingLanesStrategy } from "./strategies/index.js";

export const planReefs = createOp(PlanReefsContract, {
  strategies: {
    default: defaultStrategy,
    "shipping-lanes": shippingLanesStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
