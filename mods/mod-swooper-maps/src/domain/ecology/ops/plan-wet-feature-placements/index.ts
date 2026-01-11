import { createOp } from "@swooper/mapgen-core/authoring";

import PlanWetFeaturePlacementsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planWetFeaturePlacements = createOp(PlanWetFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planWetFeaturePlacements;
