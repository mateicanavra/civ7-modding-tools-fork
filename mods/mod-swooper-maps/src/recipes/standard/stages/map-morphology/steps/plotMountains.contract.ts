import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { M10_EFFECT_TAGS } from "../../../tags.js";
import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const PlotMountainsStepContract = defineStep({
  id: "plot-mountains",
  phase: "gameplay",
  requires: [M10_EFFECT_TAGS.map.continentsPlotted],
  provides: [M10_EFFECT_TAGS.map.mountainsPlotted],
  artifacts: {
    requires: [foundationArtifacts.plates, morphologyArtifacts.topography],
    provides: [],
  },
  ops: {
    mountains: morphology.ops.planRidgesAndFoothills,
  },
  schema: Type.Object(
    {},
    {
      additionalProperties: false,
      description: "Gameplay mountain projection config (op envelope for morphology/plan-ridges-and-foothills).",
    }
  ),
});

export default PlotMountainsStepContract;
