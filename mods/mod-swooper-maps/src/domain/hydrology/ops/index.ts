import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import computeWindFields from "./compute-wind-fields/index.js";

const implementations = {
  computeWindFields,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export { computeWindFields };
