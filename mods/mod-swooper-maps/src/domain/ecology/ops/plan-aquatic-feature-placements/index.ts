import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanAquaticFeaturePlacementsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planAquaticFeaturePlacements = createOp(PlanAquaticFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

export default planAquaticFeaturePlacements;
