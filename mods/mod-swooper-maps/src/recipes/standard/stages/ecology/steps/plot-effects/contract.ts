import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const PlotEffectsStepConfigSchema = Type.Object(
  {
    plotEffects: ecology.ops.planPlotEffects.config},
  {}
);

const PlotEffectsStepContract = defineStepContract({
  id: "plot-effects",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  ],
  provides: [],
  schema: PlotEffectsStepConfigSchema});

export default PlotEffectsStepContract;
