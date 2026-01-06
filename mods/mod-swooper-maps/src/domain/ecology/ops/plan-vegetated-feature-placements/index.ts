import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanVegetatedFeaturePlacementsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planVegetatedFeaturePlacements = createOp(PlanVegetatedFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

