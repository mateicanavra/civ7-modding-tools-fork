import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanIceContract } from "./contract.js";
import { continentalityStrategy, defaultStrategy } from "./strategies/index.js";

export const planIce = createOp(PlanIceContract, {
  strategies: {
    default: defaultStrategy,
    continentality: continentalityStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
