import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PlanIceContract } from "../contract.js";

export const defaultStrategy = createStrategy(PlanIceContract, "default", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const temperature = input.surfaceTemperature[idx];
        if (input.landMask[idx] === 0) {
          if (temperature <= config.seaIceThreshold) {
            placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
          }
        } else if (input.elevation[idx] >= config.alpineThreshold) {
          placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
        }
      }
    }
    return { placements };
  },
});
