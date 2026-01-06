import { createStrategy } from "@swooper/mapgen-core/authoring";

import {
  PlanPlotEffectsContract,
  resolvePlotEffectsConfig,
  type ResolvedPlotEffectsConfig,
} from "../contract.js";
import { planPlotEffects as planPlotEffectsImpl } from "../plan.js";

export const defaultStrategy = createStrategy(PlanPlotEffectsContract, "default", {
  resolveConfig: (config) => resolvePlotEffectsConfig(config),
  run: (input, config) => {
    const placements = planPlotEffectsImpl(input, config as ResolvedPlotEffectsConfig);
    return { placements };
  },
});
