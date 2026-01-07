import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanReefsContract } from "../contract.js";

const EMPTY_CONFIG: Static<typeof PlanReefsContract["strategies"]["default"]> = {} as Static<
  typeof PlanReefsContract["strategies"]["default"]
>;
const resolveConfig = (input?: Static<typeof PlanReefsContract["strategies"]["default"]>) =>
  applySchemaDefaults(PlanReefsContract.strategies.default, input ?? EMPTY_CONFIG);

export const defaultStrategy = createStrategy(PlanReefsContract, "default", {
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
        if ((x + y) % 3 !== 0) continue; // simple spacing
        placements.push({ x, y, feature: "FEATURE_REEF", weight: resolved.density });
      }
    }
    return { placements };
  },
});
