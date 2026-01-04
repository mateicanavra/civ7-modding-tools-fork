import { createOp, type Static } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsSchema } from "./schema.js";

type PlanFloodplainsInput = Static<typeof PlanFloodplainsSchema["properties"]["input"]>;
type PlanFloodplainsConfig = Static<typeof PlanFloodplainsSchema["properties"]["config"]>;

export const planFloodplains = createOp({
  kind: "plan",
  id: "placement/plan-floodplains",
  schema: PlanFloodplainsSchema,

  customValidate: (_input: PlanFloodplainsInput, config: PlanFloodplainsConfig) => {
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
  run: (_input: PlanFloodplainsInput, config: PlanFloodplainsConfig) => {
    return {
      minLength: config.minLength,
      maxLength: config.maxLength,
    };
  },
} as const);
