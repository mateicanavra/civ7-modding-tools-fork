import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M10_EFFECT_TAGS } from "../../../tags.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const PlotVolcanoesStepContract = defineStep({
  id: "plot-volcanoes",
  phase: "gameplay",
  requires: [M10_EFFECT_TAGS.map.continentsPlotted],
  provides: [M10_EFFECT_TAGS.map.volcanoesPlotted],
  artifacts: {
    requires: [morphologyArtifacts.topography, morphologyArtifacts.volcanoes],
    provides: [],
  },
  schema: Type.Object({}),
});

export default PlotVolcanoesStepContract;
