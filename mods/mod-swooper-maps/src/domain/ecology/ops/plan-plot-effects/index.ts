import { createOp } from "@swooper/mapgen-core/authoring";
import {
  PlanPlotEffectsSchema,
  resolvePlotEffectsConfig,
  type ResolvedPlotEffectsConfig,
} from "./schema.js";
import { planPlotEffects as planPlotEffectsImpl } from "./plan.js";

export const planPlotEffects = createOp({
  kind: "plan",
  id: "ecology/plot-effects/placement",
  input: PlanPlotEffectsSchema.properties.input,
  output: PlanPlotEffectsSchema.properties.output,
  strategies: {
    default: {
      config: PlanPlotEffectsSchema.properties.config,
      resolveConfig: (config) => resolvePlotEffectsConfig(config),
      run: (input, config) => {
        const placements = planPlotEffectsImpl(input, config as ResolvedPlotEffectsConfig);
        return { placements };
      },
    },
  },
});

export * from "./schema.js";
