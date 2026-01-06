import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanFloodplainsContract } from "../contract.js";

export const defaultStrategy = createStrategy(PlanFloodplainsContract, "default", {
  run: (_input, config) => {
    return {
      minLength: config.minLength,
      maxLength: config.maxLength,
    };
  },
});
