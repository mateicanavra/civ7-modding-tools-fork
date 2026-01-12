import planFloodplains from "./ops/plan-floodplains/index.js";
import planStarts from "./ops/plan-starts/index.js";
import planWonders from "./ops/plan-wonders/index.js";

import {
  createDomainOpsSurface,
  type DomainOpImplementationsFor,
} from "@swooper/mapgen-core/authoring";
import contracts from "./contracts.js";

const implementations = {
  planFloodplains,
  planStarts,
  planWonders,
} as const satisfies DomainOpImplementationsFor<typeof contracts>;

export const ops = createDomainOpsSurface(implementations);

export default ops;

