import { createStep } from "@swooper/mapgen-core/authoring";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";
import PlotEffectsStepContract from "./contract.js";

export default createStep(PlotEffectsStepContract, {
  run: (context, config, ops, deps) => {
    const artifacts = {
      classification: deps.artifacts.biomeClassification.read(context),
      heightfield: deps.artifacts.heightfield.read(context),
    };
    const input = buildPlotEffectsInput(context, artifacts);
    const result = ops.plotEffects(input, config.plotEffects);

    if (context.trace.isVerbose) {
      logSnowEligibilitySummary(
        context.trace,
        input,
        config.plotEffects.config,
        result.placements,
        artifacts.heightfield.terrain
      );
    }

    if (result.placements.length > 0) {
      applyPlotEffectPlacements(context, result.placements);
    }
  },
});
