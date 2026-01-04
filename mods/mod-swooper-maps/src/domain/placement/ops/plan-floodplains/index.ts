import { createOp, type Static } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsSchema } from "./schema.js";

type PlanFloodplainsInput = Static<typeof PlanFloodplainsSchema["properties"]["input"]>;
type PlanFloodplainsConfig = Static<typeof PlanFloodplainsSchema["properties"]["config"]>;
type PlanFloodplainsOpConfig = Readonly<{
  strategy: "default";
  config: PlanFloodplainsConfig;
}>;

export const planFloodplains = createOp({
  kind: "plan",
  id: "placement/plan-floodplains",
  input: PlanFloodplainsSchema.properties.input,
  output: PlanFloodplainsSchema.properties.output,
  customValidate: (_input: PlanFloodplainsInput, config: PlanFloodplainsOpConfig) => {
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
      run: (_input: PlanFloodplainsInput, config: PlanFloodplainsConfig) => {
        return {
          minLength: config.minLength,
          maxLength: config.maxLength,
        };
      },
    },
  },
} as const);
