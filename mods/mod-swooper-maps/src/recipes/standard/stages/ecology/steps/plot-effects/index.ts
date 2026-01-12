import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import { heightfieldArtifact } from "../../../../artifacts.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";
import PlotEffectsStepContract from "./contract.js";
type PlotEffectsStepConfig = Static<typeof PlotEffectsStepContract.schema>;

export default createStep(PlotEffectsStepContract, {
  run: (context: ExtendedMapContext, config: PlotEffectsStepConfig, ops) => {
    const input = buildPlotEffectsInput(context);
    const result = ops.plotEffects(input, config.plotEffects);

    if (context.trace.isVerbose) {
      const heightfield = heightfieldArtifact.get(context);
      logSnowEligibilitySummary(
        context.trace,
        input,
        config.plotEffects.config,
        result.placements,
        heightfield.terrain
      );
    }

    if (result.placements.length > 0) {
      applyPlotEffectPlacements(context, result.placements);
    }
  },
});
