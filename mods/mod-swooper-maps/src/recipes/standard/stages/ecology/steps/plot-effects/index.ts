import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import { heightfieldArtifact } from "../../../../artifacts.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";
import { PlotEffectsStepContract } from "./contract.js";

type PlotEffectsStepConfig = Static<typeof PlotEffectsStepContract.schema>;

const opContracts = {
  planPlotEffects: ecologyContracts.PlanPlotEffectsContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(PlotEffectsStepContract, {
  normalize: (config, ctx) => {
    return {
      plotEffects: compileOps.planPlotEffects.normalize(config.plotEffects, ctx),
    };
  },
  run: (context: ExtendedMapContext, config: PlotEffectsStepConfig) => {
    const input = buildPlotEffectsInput(context);
    const result = runtimeOps.planPlotEffects.run(input, config.plotEffects);

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
