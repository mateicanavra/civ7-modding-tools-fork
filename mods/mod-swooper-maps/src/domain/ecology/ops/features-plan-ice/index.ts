import { createOp } from "@swooper/mapgen-core/authoring";
import PlanIceContract from "./contract.js";
import { continentalityStrategy, defaultStrategy } from "./strategies/index.js";

const planIce = createOp(PlanIceContract, {
  strategies: {
    default: defaultStrategy,
    continentality: continentalityStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planIce;
