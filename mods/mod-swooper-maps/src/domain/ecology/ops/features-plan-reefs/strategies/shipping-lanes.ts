import { createStrategy } from "@swooper/mapgen-core/authoring";
import PlanReefsContract from "../contract.js";
export const shippingLanesStrategy = createStrategy(PlanReefsContract, "shipping-lanes", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] !== 0) continue; // water only
        const temperature = input.surfaceTemperature[idx];
        if (temperature < config.warmThreshold) continue;
        // Stripe bias to mimic lanes/hops
        const stripe = (x + 2 * y) % 5 === 0;
        if (!stripe) continue;
        placements.push({ x, y, feature: "FEATURE_REEF", weight: config.density });
      }
    }
    return { placements };
  },
});
