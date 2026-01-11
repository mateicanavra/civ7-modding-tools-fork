import { createOp } from "@swooper/mapgen-core/authoring";

import PlanVegetatedFeaturePlacementsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planVegetatedFeaturePlacements = createOp(PlanVegetatedFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planVegetatedFeaturePlacements;
