import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeRadiativeForcing from "./compute-radiative-forcing/index.js";
import computeThermalState from "./compute-thermal-state/index.js";
import computeAtmosphericCirculation from "./compute-atmospheric-circulation/index.js";
import computeOceanSurfaceCurrents from "./compute-ocean-surface-currents/index.js";
import computeEvaporationSources from "./compute-evaporation-sources/index.js";
import transportMoisture from "./transport-moisture/index.js";
import computePrecipitation from "./compute-precipitation/index.js";

const implementations = {
  computeRadiativeForcing,
  computeThermalState,
  computeAtmosphericCirculation,
  computeOceanSurfaceCurrents,
  computeEvaporationSources,
  transportMoisture,
  computePrecipitation,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export {
  computeRadiativeForcing,
  computeThermalState,
  computeAtmosphericCirculation,
  computeOceanSurfaceCurrents,
  computeEvaporationSources,
  transportMoisture,
  computePrecipitation,
};
