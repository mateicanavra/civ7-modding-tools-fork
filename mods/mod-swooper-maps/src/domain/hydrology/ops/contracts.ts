import ComputeRadiativeForcingContract from "./compute-radiative-forcing/contract.js";
import ComputeThermalStateContract from "./compute-thermal-state/contract.js";
import ComputeAtmosphericCirculationContract from "./compute-atmospheric-circulation/contract.js";
import ComputeOceanSurfaceCurrentsContract from "./compute-ocean-surface-currents/contract.js";
import ComputeEvaporationSourcesContract from "./compute-evaporation-sources/contract.js";
import TransportMoistureContract from "./transport-moisture/contract.js";
import ComputePrecipitationContract from "./compute-precipitation/contract.js";

export const contracts = {
  computeRadiativeForcing: ComputeRadiativeForcingContract,
  computeThermalState: ComputeThermalStateContract,
  computeAtmosphericCirculation: ComputeAtmosphericCirculationContract,
  computeOceanSurfaceCurrents: ComputeOceanSurfaceCurrentsContract,
  computeEvaporationSources: ComputeEvaporationSourcesContract,
  transportMoisture: TransportMoistureContract,
  computePrecipitation: ComputePrecipitationContract,
} as const;

export default contracts;
