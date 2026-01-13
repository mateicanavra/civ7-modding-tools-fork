import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyPreArtifacts } from "../../../hydrology-pre/artifacts.js";

const PlotEffectsStepContract = defineStep({
  id: "plot-effects",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [hydrologyPreArtifacts.heightfield, ecologyArtifacts.biomeClassification],
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
