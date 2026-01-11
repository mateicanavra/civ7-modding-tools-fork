import { createOp } from "@swooper/mapgen-core/authoring";

import PlanIceFeaturePlacementsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planIceFeaturePlacements = createOp(PlanIceFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planIceFeaturePlacements;
