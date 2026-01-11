import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { heightfieldArtifact } from "../../../../artifacts.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";
import PlotEffectsStepContract from "./contract.js";
type PlotEffectsStepConfig = Static<typeof PlotEffectsStepContract.schema>;

const opContracts = {
  planPlotEffects: ecology.contracts.planPlotEffects,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(PlotEffectsStepContract, {
  normalize: (config, ctx) => {
    return {
      plotEffects: compile.planPlotEffects.normalize(config.plotEffects, ctx),
    };
  },
  run: (context: ExtendedMapContext, config: PlotEffectsStepConfig) => {
    const input = buildPlotEffectsInput(context);
    const result = runtime.planPlotEffects.run(input, config.plotEffects);

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
