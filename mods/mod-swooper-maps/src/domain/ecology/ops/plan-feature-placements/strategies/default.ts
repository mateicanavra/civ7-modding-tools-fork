import { createStrategy } from "@swooper/mapgen-core/authoring";

import {
  PlanFeaturePlacementsContract,
  resolveFeaturesPlacementConfig,
  type ResolvedFeaturesPlacementConfig,
} from "../contract.js";
import { planFeaturePlacements as planFeaturePlacementsImpl } from "../plan.js";

export const defaultStrategy = createStrategy(PlanFeaturePlacementsContract, "default", {
  resolveConfig: (config) => resolveFeaturesPlacementConfig(config),
  run: (input, config) => {
    const placements = planFeaturePlacementsImpl(input, config as ResolvedFeaturesPlacementConfig);
    return { placements };
  },
});
