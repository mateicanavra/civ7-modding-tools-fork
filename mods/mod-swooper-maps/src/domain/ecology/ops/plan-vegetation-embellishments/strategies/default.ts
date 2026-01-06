import { createStrategy } from "@swooper/mapgen-core/authoring";

import {
  PlanVegetationEmbellishmentsContract,
  resolveVegetationEmbellishmentsConfig,
  type ResolvedVegetationEmbellishmentsConfig,
} from "../contract.js";
import { planVegetationEmbellishments as planVegetationEmbellishmentsImpl } from "../plan.js";

export const defaultStrategy = createStrategy(PlanVegetationEmbellishmentsContract, "default", {
  resolveConfig: (config) => resolveVegetationEmbellishmentsConfig(config),
  run: (input, config) => {
    const placements = planVegetationEmbellishmentsImpl(
      input,
      config as ResolvedVegetationEmbellishmentsConfig
    );
    return { placements };
  },
});
