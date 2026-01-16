import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeBaseTopography from "./compute-base-topography/index.js";
import computeCoastlineMetrics from "./compute-coastline-metrics/index.js";
import computeFlowRouting from "./compute-flow-routing/index.js";
import computeGeomorphicCycle from "./compute-geomorphic-cycle/index.js";
import computeLandmask from "./compute-landmask/index.js";
import computeLandmasses from "./compute-landmasses/index.js";
import computeSeaLevel from "./compute-sea-level/index.js";
import computeSubstrate from "./compute-substrate/index.js";
import planIslandChains from "./plan-island-chains/index.js";
import planRidgesAndFoothills from "./plan-ridges-and-foothills/index.js";
import planVolcanoes from "./plan-volcanoes/index.js";

const implementations = {
  computeBaseTopography,
  computeCoastlineMetrics,
  computeFlowRouting,
  computeGeomorphicCycle,
  computeLandmask,
  computeLandmasses,
  computeSeaLevel,
  computeSubstrate,
  planIslandChains,
  planRidgesAndFoothills,
  planVolcanoes,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export {
  computeBaseTopography,
  computeCoastlineMetrics,
  computeFlowRouting,
  computeGeomorphicCycle,
  computeLandmask,
  computeLandmasses,
  computeSeaLevel,
  computeSubstrate,
  planIslandChains,
  planRidgesAndFoothills,
  planVolcanoes,
};
