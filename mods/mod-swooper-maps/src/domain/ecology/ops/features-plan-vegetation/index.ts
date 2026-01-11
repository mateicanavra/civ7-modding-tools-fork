import { createOp } from "@swooper/mapgen-core/authoring";
import PlanVegetationContract from "./contract.js";
import { clusteredStrategy, defaultStrategy } from "./strategies/index.js";

const planVegetation = createOp(PlanVegetationContract, {
  strategies: {
    default: defaultStrategy,
    clustered: clusteredStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planVegetation;
