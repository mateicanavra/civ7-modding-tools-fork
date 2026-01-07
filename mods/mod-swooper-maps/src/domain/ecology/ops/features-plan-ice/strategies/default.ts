import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanIceContract } from "../contract.js";

const EMPTY_CONFIG: Static<typeof PlanIceContract["strategies"]["default"]> = {} as Static<
  typeof PlanIceContract["strategies"]["default"]
>;
const resolveConfig = (input?: Static<typeof PlanIceContract["strategies"]["default"]>) =>
  applySchemaDefaults(PlanIceContract.strategies.default, input ?? EMPTY_CONFIG);

export const defaultStrategy = createStrategy(PlanIceContract, "default", {
  resolveConfig,
  run: (input, config) => {
    const resolved = resolveConfig(config);
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const temperature = input.surfaceTemperature[idx] ?? 0;
        if (input.landMask[idx] === 0) {
          if (temperature <= resolved.seaIceThreshold) {
            placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
          }
        } else if (input.elevation[idx]! >= resolved.alpineThreshold) {
          placements.push({ x, y, feature: "FEATURE_ICE", weight: 1 });
        }
      }
    }
    return { placements };
  },
});
