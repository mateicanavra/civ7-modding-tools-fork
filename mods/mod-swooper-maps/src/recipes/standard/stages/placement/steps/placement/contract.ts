import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS, M10_EFFECT_TAGS } from "../../../../tags.js";
import { placementArtifacts } from "../../artifacts.js";
import { mapArtifacts } from "../../../../map-artifacts.js";

const PlacementStepContract = defineStep({
  id: "placement",
  phase: "placement",
  requires: [M10_EFFECT_TAGS.map.landmassRegionsPlotted],
  provides: [M4_EFFECT_TAGS.engine.placementApplied],
  artifacts: {
    requires: [placementArtifacts.placementInputs, mapArtifacts.landmassRegionSlotByTile],
    provides: [placementArtifacts.placementOutputs],
  },
  schema: Type.Object({}),
});

export default PlacementStepContract;
