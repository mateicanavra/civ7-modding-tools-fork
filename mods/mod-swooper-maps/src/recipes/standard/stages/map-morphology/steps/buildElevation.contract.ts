import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M10_EFFECT_TAGS } from "../../../tags.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const BuildElevationStepContract = defineStep({
  id: "build-elevation",
  phase: "gameplay",
  requires: [M10_EFFECT_TAGS.map.mountainsPlotted, M10_EFFECT_TAGS.map.volcanoesPlotted],
  provides: [M10_EFFECT_TAGS.map.elevationBuilt],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [],
  },
  schema: Type.Object({}),
});

export default BuildElevationStepContract;
