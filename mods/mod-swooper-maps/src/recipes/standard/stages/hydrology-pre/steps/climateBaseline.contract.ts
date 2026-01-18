import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyPreArtifacts } from "../artifacts.js";

const ClimateBaselineStepContract = defineStep({
  id: "climate-baseline",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [hydrologyPreArtifacts.heightfield],
    provides: [hydrologyPreArtifacts.climateField, hydrologyPreArtifacts.windField],
  },
  ops: {
    computeRadiativeForcing: hydrology.ops.computeRadiativeForcing,
    computeThermalState: hydrology.ops.computeThermalState,
    computeAtmosphericCirculation: hydrology.ops.computeAtmosphericCirculation,
    computeOceanSurfaceCurrents: hydrology.ops.computeOceanSurfaceCurrents,
    computeEvaporationSources: hydrology.ops.computeEvaporationSources,
    transportMoisture: hydrology.ops.transportMoisture,
    computePrecipitation: hydrology.ops.computePrecipitation,
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default ClimateBaselineStepContract;
