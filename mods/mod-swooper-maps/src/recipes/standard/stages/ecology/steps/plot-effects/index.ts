import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import type { ResolvedPlotEffectsConfig } from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";
import { assertHeightfield } from "../biomes/helpers/inputs.js";
import { PlotEffectsStepContract } from "./contract.js";

type PlotEffectsStepConfig = Static<typeof PlotEffectsStepContract.schema>;

export default createStep(PlotEffectsStepContract, {
  resolveConfig: (config, settings) => {
    return {
      plotEffects: ecology.ops.planPlotEffects.resolveConfig(config.plotEffects, settings),
    };
  },
  run: (context: ExtendedMapContext, config: PlotEffectsStepConfig) => {
    const input = buildPlotEffectsInput(context);
    const result = ecology.ops.planPlotEffects.runValidated(input, config.plotEffects);

    if (context.trace.isVerbose) {
      const heightfield = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
      assertHeightfield(heightfield, context.dimensions.width * context.dimensions.height);
      logSnowEligibilitySummary(
        context.trace,
        input,
        config.plotEffects.config as ResolvedPlotEffectsConfig,
        result.placements,
        heightfield.terrain
      );
    }

    if (result.placements.length > 0) {
      applyPlotEffectPlacements(context, result.placements);
    }
  },
});
