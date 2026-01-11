import { planFloodplains } from "./ops/plan-floodplains/index.js";
import { PlanFloodplainsContract } from "./ops/plan-floodplains/contract.js";
import { planStarts } from "./ops/plan-starts/index.js";
import { PlanStartsContract } from "./ops/plan-starts/contract.js";
import { planWonders } from "./ops/plan-wonders/index.js";
import { PlanWondersContract } from "./ops/plan-wonders/contract.js";
import { createDomainOpsSurface } from "@swooper/mapgen-core/authoring";

const opImplementations = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

export const ops = createDomainOpsSurface(opImplementations);

export { planFloodplains, planStarts, planWonders };

export { PlanFloodplainsContract, PlanStartsContract, PlanWondersContract };

export const contracts = {
  planFloodplains: PlanFloodplainsContract,
  planStarts: PlanStartsContract,
  planWonders: PlanWondersContract,
} as const;

export default ops;
