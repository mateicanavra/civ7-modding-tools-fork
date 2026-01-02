import { Type } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { buildPlotEffectsInput } from "./inputs.js";
import { applyPlotEffectPlacements } from "./apply.js";

const PlotEffectsStepConfigSchema = Type.Object(
  {
    plotEffects: ecology.ops.plotEffects.config,
  },
  {
    additionalProperties: false,
    default: { plotEffects: ecology.ops.plotEffects.defaultConfig },
  }
);

type PlotEffectsStepConfig = {
  plotEffects: Parameters<typeof ecology.ops.plotEffects.run>[1];
};

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
    const result = ecology.ops.plotEffects.run(input, config.plotEffects);
    if (context.trace.isVerbose) {
      const resolved = ecology.resolvePlotEffectsConfig(config.plotEffects);
      ecology.logSnowEligibilitySummary(context.trace, input, resolved, result.placements);
    }

    if (result.placements.length > 0) {
      applyPlotEffectPlacements(context, result.placements);
    }
  },
} as const);
