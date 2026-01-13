import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

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
    climate: Type.Object({
      story: Type.Object({
        paleo: Type.Optional(ClimateConfigSchema.properties.story.properties.paleo),
      }),
    }),
  }),
});

export default RiversStepContract;
