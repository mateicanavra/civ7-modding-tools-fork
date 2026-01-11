import { createOp } from "@swooper/mapgen-core/authoring";

import PlanAquaticFeaturePlacementsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planAquaticFeaturePlacements = createOp(PlanAquaticFeaturePlacementsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planAquaticFeaturePlacements;
