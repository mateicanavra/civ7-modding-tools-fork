import { createStrategy } from "@swooper/mapgen-core/authoring";

import {
  PlanReefEmbellishmentsContract,
  resolveReefEmbellishmentsConfig,
  type ResolvedReefEmbellishmentsConfig,
} from "../contract.js";
import { planReefEmbellishments as planReefEmbellishmentsImpl } from "../plan.js";

export const defaultStrategy = createStrategy(PlanReefEmbellishmentsContract, "default", {
  resolveConfig: (config) => resolveReefEmbellishmentsConfig(config),
  run: (input, config) => {
    const placements = planReefEmbellishmentsImpl(
      input,
      config as ResolvedReefEmbellishmentsConfig
    );
    return { placements };
  },
});
