import { clamp01 } from "@swooper/mapgen-core";
import { createStrategy } from "@swooper/mapgen-core/authoring";
import PlanWetlandsContract from "../contract.js";
export const defaultStrategy = createStrategy(PlanWetlandsContract, "default", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const moistureNormalization = Math.max(0.0001, config.moistureNormalization ?? 230);
    const fertility = input.fertility;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] === 0) continue;
        if (input.elevation[idx] > config.maxElevation) continue;
        const moisture = input.effectiveMoisture[idx] / moistureNormalization;
        const fert = fertility[idx];
        if (moisture < config.moistureThreshold && fert < config.fertilityThreshold) continue;
        placements.push({ x, y, feature: "FEATURE_MARSH", weight: clamp01(moisture) });
      }
    }
    return { placements };
  },
});
