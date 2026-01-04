import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsSchema } from "./schema.js";

export const planFloodplains = createOp<
  typeof PlanFloodplainsSchema["properties"]["input"],
  typeof PlanFloodplainsSchema["properties"]["output"],
  { default: typeof PlanFloodplainsSchema["properties"]["config"] }
>({
  kind: "plan",
  id: "placement/plan-floodplains",
  input: PlanFloodplainsSchema.properties.input,
  output: PlanFloodplainsSchema.properties.output,
  customValidate: (_input, config) => {
    if (config.config.maxLength < config.config.minLength) {
      return [
        {
          path: "/config/config/maxLength",
          message: "maxLength must be greater than or equal to minLength",
        },
      ];
    }
    return [];
  },
  strategies: {
    default: {
      config: PlanFloodplainsSchema.properties.config,
      run: (_input, config) => {
        return {
          minLength: config.minLength,
          maxLength: config.maxLength,
        };
      },
    },
  },
} as const);
