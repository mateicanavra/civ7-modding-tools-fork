import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { PlotEffectsConfigSchema } from "@mapgen/config";
import {
  plotEffects,
  resolvePlotEffectsConfig,
} from "@mapgen/domain/ecology/ops/plot-effects/index.js";
import { logSnowEligibilitySummary } from "@mapgen/domain/ecology/ops/plot-effects/diagnostics.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";

const PlotEffectsStepConfigSchema = Type.Object(
  {
    plotEffects: PlotEffectsConfigSchema,
  },
  { additionalProperties: false, default: { plotEffects: {} } }
);

type PlotEffectsStepConfig = Static<typeof PlotEffectsStepConfigSchema>;

export default createStep({
  id: "plotEffects",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  ],
  provides: [],
  schema: PlotEffectsStepConfigSchema,
  run: (context: ExtendedMapContext, config: PlotEffectsStepConfig) => {
    const input = buildPlotEffectsInput(context);
    const result = plotEffects.run(input, config.plotEffects);
    if (context.trace.isVerbose) {
      const resolved = resolvePlotEffectsConfig(config.plotEffects);
      logSnowEligibilitySummary(context.trace, input, resolved, result.placements);
    }

    if (result.placements.length > 0) {
      applyPlotEffectPlacements(context, result.placements);
    }
  },
} as const);
