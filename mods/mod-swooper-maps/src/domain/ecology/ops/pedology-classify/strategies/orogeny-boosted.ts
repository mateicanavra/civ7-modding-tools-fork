import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

export const orogenyBoostedStrategy = createStrategy(PedologyClassifyContract, "orogeny-boosted", {
  run: (input, config) => {
    // Uplifted terrain: relief has more influence, fertility ceiling lower.
    const boosted = {
      ...config,
      reliefWeight: config.reliefWeight * 1.4,
      fertilityCeiling: Math.min(config.fertilityCeiling, 0.9),
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
