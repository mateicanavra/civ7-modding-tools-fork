import { createStrategy } from "@swooper/mapgen-core/authoring";
import PlanWetlandsContract from "../contract.js";
export const deltaFocusedStrategy = createStrategy(PlanWetlandsContract, "delta-focused", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const fertility = input.fertility;

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] === 0) continue;
        if (input.elevation[idx] > config.maxElevation) continue;
        const moisture = input.effectiveMoisture[idx];
        const fert = fertility[idx];
        const deltaBonus = (x + y) % 2 === 0 ? 0.1 : 0;
        if (moisture + deltaBonus < config.moistureThreshold && fert < config.fertilityThreshold) continue;
        placements.push({
          x,
          y,
          feature: "FEATURE_MARSH",
          weight: Math.min(1, moisture + deltaBonus + fert * 0.2),
        });
      }
    }
    return { placements };
  },
});
