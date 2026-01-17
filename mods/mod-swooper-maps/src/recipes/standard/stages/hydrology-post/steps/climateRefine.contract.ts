import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyCoreArtifacts } from "../../hydrology-core/artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";
import { hydrologyPostArtifacts } from "../artifacts.js";

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
    provides: [
      hydrologyPostArtifacts.climateIndices,
      hydrologyPostArtifacts.cryosphere,
      hydrologyPostArtifacts.climateDiagnostics,
    ],
  },
  ops: {
    computePrecipitation: hydrology.ops.computePrecipitation,
    computeRadiativeForcing: hydrology.ops.computeRadiativeForcing,
    computeThermalState: hydrology.ops.computeThermalState,
    applyAlbedoFeedback: hydrology.ops.applyAlbedoFeedback,
    computeCryosphereState: hydrology.ops.computeCryosphereState,
    computeLandWaterBudget: hydrology.ops.computeLandWaterBudget,
    computeClimateDiagnostics: hydrology.ops.computeClimateDiagnostics,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default ClimateRefineStepContract;
