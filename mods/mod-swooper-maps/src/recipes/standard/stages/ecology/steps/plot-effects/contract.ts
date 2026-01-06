import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const PlotEffectsStepConfigSchema = Type.Object(
  {
    plotEffects: ecology.ops.planPlotEffects.config,
  },
  {
    additionalProperties: false,
    default: { plotEffects: ecology.ops.planPlotEffects.defaultConfig },
  }
);

export const PlotEffectsStepContract = defineStepContract({
  id: "plotEffects",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  ],
  provides: [],
  schema: PlotEffectsStepConfigSchema,
} as const);
