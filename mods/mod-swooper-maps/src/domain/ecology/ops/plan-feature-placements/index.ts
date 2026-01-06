import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanFeaturePlacementsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planFeaturePlacements = createOp(PlanFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
