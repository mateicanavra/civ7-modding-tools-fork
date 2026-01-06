import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanStartsSchema } from "./schema.js";

export const planStarts = createOp<
  typeof PlanStartsSchema["properties"]["input"],
  typeof PlanStartsSchema["properties"]["output"],
  { default: typeof PlanStartsSchema["properties"]["config"] }
>({
  kind: "plan",
  id: "placement/plan-starts",
  input: PlanStartsSchema.properties.input,
  output: PlanStartsSchema.properties.output,
  strategies: {
    default: {
      config: PlanStartsSchema.properties.config,
      run: (input, config) => {
        const baseStarts = input.baseStarts;
        const overrides = config.overrides;

        if (!overrides) {
          return { ...baseStarts, startSectors: [...baseStarts.startSectors] };
        }

        return {
          ...baseStarts,
          ...overrides,
          startSectors: [...(overrides.startSectors ?? baseStarts.startSectors)],
        };
      },
    },
  },
} as const);
