import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M10_EFFECT_TAGS } from "../../../tags.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const PlotContinentsStepContract = defineStep({
  id: "plot-continents",
  phase: "gameplay",
  requires: [M10_EFFECT_TAGS.map.coastsPlotted],
  provides: [M10_EFFECT_TAGS.map.continentsPlotted],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [],
  },
  schema: Type.Object({}),
});

export default PlotContinentsStepContract;
