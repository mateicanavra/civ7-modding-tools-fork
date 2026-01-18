import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyCoreArtifacts } from "../artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";

const RiversStepContract = defineStep({
  id: "rivers",
  phase: "hydrology",
  requires: [],
  provides: [
    M4_EFFECT_TAGS.engine.riversModeled,
  ],
  artifacts: {
    requires: [hydrologyPreArtifacts.heightfield, hydrologyPreArtifacts.climateField],
    provides: [hydrologyCoreArtifacts.riverAdjacency],
  },
  schema: Type.Object({}),
});

export default RiversStepContract;
