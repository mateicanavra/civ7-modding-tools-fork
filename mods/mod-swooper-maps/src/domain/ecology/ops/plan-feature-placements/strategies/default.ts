import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanFeaturePlacementsContract, resolveFeaturesPlacementConfig } from "../contract.js";
import type { ResolvedFeaturesPlacementConfig } from "../types.js";
import { planFeaturePlacements as planFeaturePlacementsImpl } from "../plan.js";

export const defaultStrategy = createStrategy(PlanFeaturePlacementsContract, "default", {
  resolveConfig: (config) => resolveFeaturesPlacementConfig(config),
  run: (input, config) => {
    const placements = planFeaturePlacementsImpl(input, config as ResolvedFeaturesPlacementConfig);
    return { placements };
  },
});
