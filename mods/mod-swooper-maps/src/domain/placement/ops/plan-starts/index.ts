import { createOp, type Static } from "@swooper/mapgen-core/authoring";

import { PlanStartsSchema } from "./schema.js";

type PlanStartsInput = Static<typeof PlanStartsSchema["properties"]["input"]>;
type PlanStartsConfig = Static<typeof PlanStartsSchema["properties"]["config"]>;
type PlanStartsOutput = Static<typeof PlanStartsSchema["properties"]["output"]>;
type StartsConfig = PlanStartsOutput;
type StartsOverride = NonNullable<PlanStartsConfig["overrides"]>;

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
  input: PlanStartsSchema.properties.input,
  output: PlanStartsSchema.properties.output,
  strategies: {
    default: {
      config: PlanStartsSchema.properties.config,
      run: (input: PlanStartsInput, config: PlanStartsConfig) => {
        return mergeStarts(input.baseStarts, config.overrides);
      },
    },
  },
} as const);
