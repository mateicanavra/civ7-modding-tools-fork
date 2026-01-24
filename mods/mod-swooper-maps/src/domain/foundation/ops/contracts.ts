import ComputeCrustContract from "./compute-crust/contract.js";
import ComputeMeshContract from "./compute-mesh/contract.js";
import ComputePlateGraphContract from "./compute-plate-graph/contract.js";
import ComputePlatesTensorsContract from "./compute-plates-tensors/contract.js";
import ComputeTectonicHistoryContract from "./compute-tectonic-history/contract.js";
import ComputeTectonicSegmentsContract from "./compute-tectonic-segments/contract.js";

export const contracts = {
  computeMesh: ComputeMeshContract,
  computeCrust: ComputeCrustContract,
  computePlateGraph: ComputePlateGraphContract,
  computeTectonicSegments: ComputeTectonicSegmentsContract,
  computeTectonicHistory: ComputeTectonicHistoryContract,
  computePlatesTensors: ComputePlatesTensorsContract,
} as const;

export default contracts;
