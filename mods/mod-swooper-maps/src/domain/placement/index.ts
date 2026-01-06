import { planFloodplains } from "./ops/plan-floodplains/index.js";
import { planStarts } from "./ops/plan-starts/index.js";
import { planWonders } from "./ops/plan-wonders/index.js";

export const ops = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

export { planFloodplains, planStarts, planWonders };

export {
  PlanFloodplainsSchema,
} from "./ops/plan-floodplains/schema.js";

export {
  PlanStartsSchema,
} from "./ops/plan-starts/schema.js";

export {
  PlanWondersSchema,
} from "./ops/plan-wonders/schema.js";
