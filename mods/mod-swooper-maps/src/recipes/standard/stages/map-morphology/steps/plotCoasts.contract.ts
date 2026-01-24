import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M10_EFFECT_TAGS } from "../../../tags.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const PlotCoastsStepContract = defineStep({
  id: "plot-coasts",
  phase: "gameplay",
  requires: [],
  provides: [M10_EFFECT_TAGS.map.coastsPlotted],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [],
  },
  schema: Type.Object({}),
});

export default PlotCoastsStepContract;
