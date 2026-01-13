import ComputeDynamicsTensorsContract from "./compute-dynamics-tensors/contract.js";
import ComputeCrustContract from "./compute-crust/contract.js";
import ComputeMeshContract from "./compute-mesh/contract.js";
import ComputePlateGraphContract from "./compute-plate-graph/contract.js";
import ComputePlatesTensorsContract from "./compute-plates-tensors/contract.js";
import ComputeTectonicsContract from "./compute-tectonics/contract.js";

export const contracts = {
  computeMesh: ComputeMeshContract,
  computeCrust: ComputeCrustContract,
  computePlateGraph: ComputePlateGraphContract,
  computeTectonics: ComputeTectonicsContract,
  computePlatesTensors: ComputePlatesTensorsContract,
  computeDynamicsTensors: ComputeDynamicsTensorsContract,
} as const;

export default contracts;
