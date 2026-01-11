import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const PlotEffectsStepContract = defineStep({
  id: "plot-effects",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  ],
  provides: [],
  ops: {
    plotEffects: ecology.ops.planPlotEffects,
  },
  schema: Type.Object({}),
});

export default PlotEffectsStepContract;
