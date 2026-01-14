import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeDynamicsTensors from "./compute-dynamics-tensors/index.js";
import computePlatesTensors from "./compute-plates-tensors/index.js";

const implementations = {
  computePlatesTensors,
  computeDynamicsTensors,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export { computeDynamicsTensors, computePlatesTensors };
