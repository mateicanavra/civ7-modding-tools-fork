import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanVegetationContract } from "./contract.js";
import { clusteredStrategy, defaultStrategy } from "./strategies/index.js";

export const planVegetation = createOp(PlanVegetationContract, {
  strategies: {
    default: defaultStrategy,
    clustered: clusteredStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
