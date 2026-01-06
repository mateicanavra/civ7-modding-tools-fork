import { planFloodplains } from "./ops/plan-floodplains/index.js";
import { planStarts } from "./ops/plan-starts/index.js";
import { planWonders } from "./ops/plan-wonders/index.js";

export const ops = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

export { planFloodplains, planStarts, planWonders };

export { PlanFloodplainsContract } from "./ops/plan-floodplains/contract.js";
export { PlanStartsContract } from "./ops/plan-starts/contract.js";
export { PlanWondersContract } from "./ops/plan-wonders/contract.js";
