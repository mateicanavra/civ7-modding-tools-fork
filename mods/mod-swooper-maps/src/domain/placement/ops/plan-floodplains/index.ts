import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planFloodplains = createOp(PlanFloodplainsContract, {
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
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
