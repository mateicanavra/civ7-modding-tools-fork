import { createStrategy } from "@swooper/mapgen-core/authoring";
import ResourcePlanBasinsContract from "../contract.js";
import { defaultStrategy } from "./default.js";

export const hydroFluvialStrategy = createStrategy(ResourcePlanBasinsContract, "hydro-fluvial", {
  run: (input, config) => {
    const boosted = {
      ...config,
      resources: config.resources.map((res) => ({
        ...res,
        moistureBias: res.moistureBias * 1.5,
      })),
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
