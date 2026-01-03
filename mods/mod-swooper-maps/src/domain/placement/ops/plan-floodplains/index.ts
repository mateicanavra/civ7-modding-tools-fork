import { createOp } from "@swooper/mapgen-core/authoring";

import {
  PlanFloodplainsConfigSchema,
  PlanFloodplainsInputSchema,
  PlanFloodplainsOutputSchema,
  type PlanFloodplainsConfig,
  type PlanFloodplainsInput,
  type PlanFloodplainsOutput,
} from "./schema.js";

export const planFloodplains = createOp({
  kind: "plan",
  id: "placement/plan-floodplains",
  input: PlanFloodplainsInputSchema,
  output: PlanFloodplainsOutputSchema,
  config: PlanFloodplainsConfigSchema,
  customValidate: (_input, config: PlanFloodplainsConfig) => {
    if (config.maxLength < config.minLength) {
      return [
        {
          path: "/config/maxLength",
          message: "maxLength must be greater than or equal to minLength",
        },
      ];
    }
    return [];
  },
  run: (_input: PlanFloodplainsInput, config: PlanFloodplainsConfig): PlanFloodplainsOutput => {
    return {
      minLength: config.minLength,
      maxLength: config.maxLength,
    };
  },
} as const);

export type { PlanFloodplainsInput, PlanFloodplainsOutput, PlanFloodplainsConfig };
