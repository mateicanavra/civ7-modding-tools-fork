import ComputeBaseTopographyContract from "./compute-base-topography/contract.js";
import ComputeCoastlineMetricsContract from "./compute-coastline-metrics/contract.js";
import ComputeFlowRoutingContract from "./compute-flow-routing/contract.js";
import ComputeGeomorphicCycleContract from "./compute-geomorphic-cycle/contract.js";
import ComputeLandmaskContract from "./compute-landmask/contract.js";
import ComputeLandmassesContract from "./compute-landmasses/contract.js";
import ComputeSeaLevelContract from "./compute-sea-level/contract.js";
import ComputeSubstrateContract from "./compute-substrate/contract.js";
import PlanIslandChainsContract from "./plan-island-chains/contract.js";
import PlanRidgesAndFoothillsContract from "./plan-ridges-and-foothills/contract.js";
import PlanVolcanoesContract from "./plan-volcanoes/contract.js";

export const contracts = {
  computeBaseTopography: ComputeBaseTopographyContract,
  computeCoastlineMetrics: ComputeCoastlineMetricsContract,
  computeFlowRouting: ComputeFlowRoutingContract,
  computeGeomorphicCycle: ComputeGeomorphicCycleContract,
  computeLandmask: ComputeLandmaskContract,
  computeLandmasses: ComputeLandmassesContract,
  computeSeaLevel: ComputeSeaLevelContract,
  computeSubstrate: ComputeSubstrateContract,
  planIslandChains: PlanIslandChainsContract,
  planRidgesAndFoothills: PlanRidgesAndFoothillsContract,
  planVolcanoes: PlanVolcanoesContract,
} as const;

export default contracts;
