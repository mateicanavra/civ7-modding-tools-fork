import { createStrategy } from "@swooper/mapgen-core/authoring";
import { ResourceScoreBalanceContract } from "../contract.js";

export const defaultStrategy = createStrategy(ResourceScoreBalanceContract, "default", {
  run: (input, config) => {
    const basins = input.basins
      .filter((basin) => basin.confidence >= config.minConfidence)
      .map((basin) => {
        if (basin.plots.length <= config.maxPerResource) return basin;
        const trimmedPlots = basin.plots.slice(0, config.maxPerResource);
        const trimmedIntensity = basin.intensity.slice(0, config.maxPerResource);
        return { ...basin, plots: trimmedPlots, intensity: trimmedIntensity };
      });
    return { basins };
  },
});
