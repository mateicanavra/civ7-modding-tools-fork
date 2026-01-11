import { createStrategy } from "@swooper/mapgen-core/authoring";
import ResourcePlanBasinsContract from "../contract.js";
import { defaultStrategy } from "./default.js";

export const mixedStrategy = createStrategy(ResourcePlanBasinsContract, "mixed", {
  run: (input, config) => {
    const balanced = {
      ...config,
      resources: config.resources.map((res, idx) => ({
        ...res,
        fertilityBias: res.fertilityBias * (idx % 2 === 0 ? 1.1 : 0.9),
        moistureBias: res.moistureBias * (idx % 2 === 0 ? 0.9 : 1.2),
      })),
    };
    return defaultStrategy.run(input, balanced as never);
  },
});
