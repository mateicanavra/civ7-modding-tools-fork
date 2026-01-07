import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanReefsContract } from "../contract.js";

const EMPTY_CONFIG: Static<typeof PlanReefsContract["strategies"]["default"]> = {} as Static<
  typeof PlanReefsContract["strategies"]["default"]
>;
const resolveConfig = (input?: Static<typeof PlanReefsContract["strategies"]["default"]>) =>
  applySchemaDefaults(PlanReefsContract.strategies["shipping-lanes"], input ?? EMPTY_CONFIG);

export const shippingLanesStrategy = createStrategy(PlanReefsContract, "shipping-lanes", {
  resolveConfig,
  run: (input, config) => {
    const resolved = resolveConfig(config);
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] !== 0) continue; // water only
        const temperature = input.surfaceTemperature[idx] ?? 0;
        if (temperature < resolved.warmThreshold) continue;
        // Stripe bias to mimic lanes/hops
        const stripe = (x + 2 * y) % 5 === 0;
        if (!stripe) continue;
        placements.push({ x, y, feature: "FEATURE_REEF", weight: resolved.density });
      }
    }
    return { placements };
  },
});
