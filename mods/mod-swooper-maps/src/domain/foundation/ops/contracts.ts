import ComputeDynamicsTensorsContract from "./compute-dynamics-tensors/contract.js";
import ComputePlatesTensorsContract from "./compute-plates-tensors/contract.js";

export const contracts = {
  computePlatesTensors: ComputePlatesTensorsContract,
  computeDynamicsTensors: ComputeDynamicsTensorsContract,
} as const;

export default contracts;
