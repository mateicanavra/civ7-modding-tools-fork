import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeCrust from "./compute-crust/index.js";
import computeMesh from "./compute-mesh/index.js";
import computePlateGraph from "./compute-plate-graph/index.js";
import computePlatesTensors from "./compute-plates-tensors/index.js";
import computeTectonicHistory from "./compute-tectonic-history/index.js";
import computeTectonicSegments from "./compute-tectonic-segments/index.js";

const implementations = {
  computeMesh,
  computeCrust,
  computePlateGraph,
  computeTectonicSegments,
  computeTectonicHistory,
  computePlatesTensors,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export {
  computeCrust,
  computeMesh,
  computePlateGraph,
  computePlatesTensors,
  computeTectonicHistory,
  computeTectonicSegments,
};
