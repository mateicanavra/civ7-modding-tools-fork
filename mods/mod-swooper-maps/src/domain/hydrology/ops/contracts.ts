import ComputeRadiativeForcingContract from "./compute-radiative-forcing/contract.js";
import ComputeThermalStateContract from "./compute-thermal-state/contract.js";
import ComputeAtmosphericCirculationContract from "./compute-atmospheric-circulation/contract.js";
import ComputeOceanSurfaceCurrentsContract from "./compute-ocean-surface-currents/contract.js";
import ComputeEvaporationSourcesContract from "./compute-evaporation-sources/contract.js";
import TransportMoistureContract from "./transport-moisture/contract.js";
import ComputePrecipitationContract from "./compute-precipitation/contract.js";
import ComputeCryosphereStateContract from "./compute-cryosphere-state/contract.js";
import ApplyAlbedoFeedbackContract from "./apply-albedo-feedback/contract.js";
import ComputeLandWaterBudgetContract from "./compute-land-water-budget/contract.js";
import ComputeClimateDiagnosticsContract from "./compute-climate-diagnostics/contract.js";
import AccumulateDischargeContract from "./accumulate-discharge/contract.js";
import ProjectRiverNetworkContract from "./project-river-network/contract.js";

export const contracts = {
  computeRadiativeForcing: ComputeRadiativeForcingContract,
  computeThermalState: ComputeThermalStateContract,
  computeAtmosphericCirculation: ComputeAtmosphericCirculationContract,
  computeOceanSurfaceCurrents: ComputeOceanSurfaceCurrentsContract,
  computeEvaporationSources: ComputeEvaporationSourcesContract,
  transportMoisture: TransportMoistureContract,
  computePrecipitation: ComputePrecipitationContract,
  computeCryosphereState: ComputeCryosphereStateContract,
  applyAlbedoFeedback: ApplyAlbedoFeedbackContract,
  computeLandWaterBudget: ComputeLandWaterBudgetContract,
  computeClimateDiagnostics: ComputeClimateDiagnosticsContract,
  accumulateDischarge: AccumulateDischargeContract,
  projectRiverNetwork: ProjectRiverNetworkContract,
} as const;

export default contracts;
