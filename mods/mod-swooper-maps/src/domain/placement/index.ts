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
  PlanFloodplainsConfigSchema,
  PlanFloodplainsInputSchema,
  PlanFloodplainsOutputSchema,
  type PlanFloodplainsConfig,
  type PlanFloodplainsInput,
  type PlanFloodplainsOutput,
} from "./ops/plan-floodplains/schema.js";

export {
  PlanStartsConfigSchema,
  PlanStartsInputSchema,
  PlanStartsOutputSchema,
  StartsConfigSchema,
  StartsOverrideSchema,
  type PlanStartsConfig,
  type PlanStartsInput,
  type PlanStartsOutput,
  type StartsConfig,
  type StartsOverride,
} from "./ops/plan-starts/schema.js";

export {
  PlanWondersConfigSchema,
  PlanWondersInputSchema,
  PlanWondersOutputSchema,
  MapInfoSchema,
  type PlanWondersConfig,
  type PlanWondersInput,
  type PlanWondersOutput,
  type MapInfo,
} from "./ops/plan-wonders/schema.js";
