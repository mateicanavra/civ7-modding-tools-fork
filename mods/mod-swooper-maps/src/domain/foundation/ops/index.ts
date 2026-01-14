import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeCrust from "./compute-crust/index.js";
import computeDynamicsTensors from "./compute-dynamics-tensors/index.js";
import computeMesh from "./compute-mesh/index.js";
import computePlateGraph from "./compute-plate-graph/index.js";
import computePlatesTensors from "./compute-plates-tensors/index.js";
import computeTectonics from "./compute-tectonics/index.js";

const implementations = {
  computeMesh,
  computeCrust,
  computePlateGraph,
  computeTectonics,
  computePlatesTensors,
  computeDynamicsTensors,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export { computeCrust, computeDynamicsTensors, computeMesh, computePlateGraph, computePlatesTensors, computeTectonics };
