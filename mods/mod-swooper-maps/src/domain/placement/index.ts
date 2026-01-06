import { planFloodplains } from "../ops/placement/plan-floodplains/index.js";
import { planStarts } from "../ops/placement/plan-starts/index.js";
import { planWonders } from "../ops/placement/plan-wonders/index.js";

export const ops = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

export { planFloodplains, planStarts, planWonders };

export {
  PlanFloodplainsSchema,
} from "../ops/placement/plan-floodplains/schema.js";

export {
  PlanStartsSchema,
} from "../ops/placement/plan-starts/schema.js";

export {
  PlanWondersSchema,
} from "../ops/placement/plan-wonders/schema.js";
