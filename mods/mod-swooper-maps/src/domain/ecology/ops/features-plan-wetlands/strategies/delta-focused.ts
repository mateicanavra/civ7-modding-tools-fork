import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanWetlandsContract } from "../contract.js";

const EMPTY_CONFIG: Static<typeof PlanWetlandsContract["strategies"]["default"]> = {} as Static<
  typeof PlanWetlandsContract["strategies"]["default"]
>;
const normalize = (input?: Static<typeof PlanWetlandsContract["strategies"]["default"]>) =>
  applySchemaDefaults(PlanWetlandsContract.strategies["delta-focused"], input ?? EMPTY_CONFIG);

export const deltaFocusedStrategy = createStrategy(PlanWetlandsContract, "delta-focused", {
  normalize,
  run: (input, config) => {
    const resolved = normalize(config);
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const fertility = (input.fertility as Float32Array | undefined) ?? new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] === 0) continue;
        if (input.elevation[idx]! > resolved.maxElevation) continue;
        const moisture = input.effectiveMoisture[idx] ?? 0;
        const fert = fertility[idx] ?? 0;
        const deltaBonus = (x + y) % 2 === 0 ? 0.1 : 0;
        if (moisture + deltaBonus < resolved.moistureThreshold && fert < resolved.fertilityThreshold) continue;
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
