import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M10_EFFECT_TAGS } from "../../../../tags.js";
import { mapArtifacts } from "../../../../map-artifacts.js";
import { morphologyArtifacts } from "../../../morphology-pre/artifacts.js";

const PlotLandmassRegionsStepContract = defineStep({
  id: "plot-landmass-regions",
  phase: "gameplay",
  requires: [],
  provides: [M10_EFFECT_TAGS.map.landmassRegionsPlotted],
  artifacts: {
    requires: [morphologyArtifacts.topography, morphologyArtifacts.landmasses],
    provides: [mapArtifacts.projectionMeta, mapArtifacts.landmassRegionSlotByTile],
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default PlotLandmassRegionsStepContract;
