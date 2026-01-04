import { createOp, type Static } from "@swooper/mapgen-core/authoring";
import {
  PlanPlotEffectsSchema,
  resolvePlotEffectsConfig,
  type ResolvedPlotEffectsConfig,
} from "./schema.js";
import { planPlotEffects as planPlotEffectsImpl } from "./plan.js";

type PlotEffectsInput = Static<typeof PlanPlotEffectsSchema["properties"]["input"]>;
type PlotEffectsConfig = Static<typeof PlanPlotEffectsSchema["properties"]["config"]>;

export const planPlotEffects = createOp({
  kind: "plan",
  id: "ecology/plot-effects/placement",
  input: PlanPlotEffectsSchema.properties.input,
  output: PlanPlotEffectsSchema.properties.output,
  strategies: {
    default: {
      config: PlanPlotEffectsSchema.properties.config,
      resolveConfig: (config: PlotEffectsConfig) => resolvePlotEffectsConfig(config),
      run: (input: PlotEffectsInput, config: PlotEffectsConfig) => {
        const placements = planPlotEffectsImpl(input, config as ResolvedPlotEffectsConfig);
        return { placements };
      },
    },
  },
} as const);

export * from "./schema.js";
