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
  schema: Type.Object({
    minLength: Type.Integer({
      description: "Engine river modeling minimum length threshold (lower = denser).",
      default: 5,
      minimum: 1,
      maximum: 40,
    }),
    maxLength: Type.Integer({
      description: "Engine river modeling maximum length threshold.",
      default: 15,
      minimum: 1,
      maximum: 80,
    }),
  }),
});

export default RiversStepContract;
