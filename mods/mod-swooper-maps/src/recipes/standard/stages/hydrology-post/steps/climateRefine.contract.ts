import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

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
  ops: {
    computePrecipitation: hydrology.ops.computePrecipitation,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default ClimateRefineStepContract;
