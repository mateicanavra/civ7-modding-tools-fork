import {createStrategy } from "@swooper/mapgen-core/authoring";
import { PlanReefsContract } from "../contract.js";

export const defaultStrategy = createStrategy(PlanReefsContract, "default", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] !== 0) continue; // water only
        const temperature = input.surfaceTemperature[idx] ?? 0;
        if (temperature < config.warmThreshold) continue;
        if ((x + y) % 3 !== 0) continue; // simple spacing
        placements.push({ x, y, feature: "FEATURE_REEF", weight: config.density });
      }
    }
    return { placements };
  },
});
