import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import PlanIceContract from "../contract.js";
export const continentalityStrategy = createStrategy(PlanIceContract, "continentality", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const rng = createLabelRng(1337);
    const { seaIceThreshold, alpineThreshold, featherC, jitterC, densityScale } = config;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const jitter = (rng(1000, `ice:${x},${y}`) / 1000 - 0.5) * 2 * jitterC;
        const temperature = input.surfaceTemperature[idx] + jitter;
        const continentality = Math.abs(x - width / 2) / (width / 2);
        const adjustedThreshold = seaIceThreshold + continentality * -2;
        if (input.landMask[idx] === 0) {
          const delta = temperature - adjustedThreshold;
          if (delta <= 0) {
            placements.push({ x, y, feature: "FEATURE_ICE", weight: densityScale });
          } else if (delta <= featherC && featherC > 0) {
            const w = 1 - delta / featherC;
            const weight = Math.max(0, Math.min(1, w)) * densityScale;
            if (weight > 0) placements.push({ x, y, feature: "FEATURE_ICE", weight });
          }
        } else if (input.elevation[idx] >= alpineThreshold - 200 * continentality) {
          placements.push({ x, y, feature: "FEATURE_ICE", weight: densityScale });
        }
      }
    }
    return { placements };
  },
});
