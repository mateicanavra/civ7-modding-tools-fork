import { createOp } from "@swooper/mapgen-core/authoring";

import {
  PlanStartsConfigSchema,
  PlanStartsInputSchema,
  PlanStartsOutputSchema,
  StartsConfigSchema,
  type PlanStartsConfig,
  type PlanStartsInput,
  type PlanStartsOutput,
  type StartsOverride,
} from "./schema.js";

function mergeStarts(base: PlanStartsInput["baseStarts"], overrides?: StartsOverride): PlanStartsOutput {
  if (!overrides) {
    return { ...base, startSectors: [...base.startSectors] };
  }

  return {
    ...base,
    ...overrides,
    startSectors: [...(overrides.startSectors ?? base.startSectors)],
  };
}

export const planStarts = createOp({
  kind: "plan",
  id: "placement/plan-starts",
  input: PlanStartsInputSchema,
  output: PlanStartsOutputSchema,
  config: PlanStartsConfigSchema,
  run: (input: PlanStartsInput, config: PlanStartsConfig): PlanStartsOutput => {
    return mergeStarts(input.baseStarts, config.overrides);
  },
} as const);

export {
  StartsConfigSchema,
  type PlanStartsInput,
  type PlanStartsOutput,
  type PlanStartsConfig,
  type StartsOverride,
};
