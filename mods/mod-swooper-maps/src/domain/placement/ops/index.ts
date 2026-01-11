import type { DomainOpImplementationsForContracts } from "@swooper/mapgen-core/authoring";
import type { contracts } from "./contracts.js";

import planFloodplains from "./plan-floodplains/index.js";
import planStarts from "./plan-starts/index.js";
import planWonders from "./plan-wonders/index.js";

const implementations = {
  planFloodplains,
  planStarts,
  planWonders,
} as const satisfies DomainOpImplementationsForContracts<typeof contracts>;

export default implementations;

export { planFloodplains, planStarts, planWonders };
