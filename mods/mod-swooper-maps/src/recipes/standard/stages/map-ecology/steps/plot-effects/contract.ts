import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { ecologyArtifacts } from "../../../ecology/artifacts.js";
import { morphologyArtifacts } from "../../../morphology-pre/artifacts.js";

const PlotEffectsStepContract = defineStep({
  id: "plot-effects",
  phase: "gameplay",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography, ecologyArtifacts.biomeClassification],
  },
  ops: {
    plotEffects: ecology.ops.planPlotEffects,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for climate-driven plot effects (snow, sand, burn).",
    }
  ),
});

export default PlotEffectsStepContract;
