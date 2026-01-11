import PlanFloodplainsContract from "./ops/plan-floodplains/contract.js";
import PlanStartsContract from "./ops/plan-starts/contract.js";
import PlanWondersContract from "./ops/plan-wonders/contract.js";

export const contracts = {
  planFloodplains: PlanFloodplainsContract,
  planStarts: PlanStartsContract,
  planWonders: PlanWondersContract,
} as const;

export default contracts;

export { PlanFloodplainsContract, PlanStartsContract, PlanWondersContract };

