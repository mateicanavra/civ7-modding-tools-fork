import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const PlotEffectsStepContract = defineStep({
  id: "plot-effects",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  ],
  provides: [],
  schema: Type.Object({
    plotEffects: ecology.ops.planPlotEffects.config,
  }),
});

export default PlotEffectsStepContract;
