import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanIceContract } from "../contract.js";

const EMPTY_CONFIG: Static<typeof PlanIceContract["strategies"]["default"]> = {} as Static<
  typeof PlanIceContract["strategies"]["default"]
>;
const normalize = (input?: Static<typeof PlanIceContract["strategies"]["default"]>) =>
  applySchemaDefaults(PlanIceContract.strategies.continentality, input ?? EMPTY_CONFIG);

export const continentalityStrategy = createStrategy(PlanIceContract, "continentality", {
  normalize,
  run: (input, config) => {
    const resolved = normalize(config);
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const temperature = input.surfaceTemperature[idx] ?? 0;
        const continentality = Math.abs(x - width / 2) / (width / 2);
        const adjustedThreshold = resolved.seaIceThreshold + continentality * -2;
        if (input.landMask[idx] === 0) {
          if (temperature <= adjustedThreshold) {
            placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
          }
        } else if (input.elevation[idx]! >= resolved.alpineThreshold - 200 * continentality) {
          placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
        }
      }
    }
    return { placements };
  },
});
