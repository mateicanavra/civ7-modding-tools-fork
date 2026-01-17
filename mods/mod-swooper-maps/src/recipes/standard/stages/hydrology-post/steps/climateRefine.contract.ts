import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { hydrologyCoreArtifacts } from "../../hydrology-core/artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";

const ClimateRefineStepContract = defineStep({
  id: "climate-refine",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.heightfield,
      hydrologyPreArtifacts.climateField,
      hydrologyPreArtifacts.windField,
      hydrologyCoreArtifacts.riverAdjacency,
    ],
  },
  schema: Type.Object({
    climate: ClimateConfigSchema,
  }),
});

export default ClimateRefineStepContract;
