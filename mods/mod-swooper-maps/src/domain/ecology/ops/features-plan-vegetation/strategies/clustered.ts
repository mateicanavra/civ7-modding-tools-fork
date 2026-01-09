import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PlanVegetationContract } from "../contract.js";
import { biomeSymbolFromIndex, FEATURE_PLACEMENT_KEYS } from "@mapgen/domain/ecology/types.js";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const clusteredStrategy = createStrategy(PlanVegetationContract, "clustered", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const fertility = (input.fertility as Float32Array | undefined) ?? new Float32Array(width * height);

    const noise = (x: number, y: number) => (Math.sin((x + 1.3) * (y + 0.7)) + 1) * 0.25;

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] === 0) continue;
        const vegetation = input.vegetationDensity[idx] ?? 0;
        if (vegetation <= 0) continue;
        const temp = input.surfaceTemperature[idx] ?? 0;
        if (temp < config.coldCutoff) continue;

        const fertilityValue = fertility[idx] ?? 0;
        const moisture = input.effectiveMoisture[idx] ?? vegetation;
        const clusterBonus = noise(x, y);
        const weight = clamp01(
          config.baseDensity +
            fertilityValue * config.fertilityWeight +
            moisture * config.moistureWeight +
            clusterBonus * 0.15
        );
        if (weight < 0.15) continue;

        const biomeSymbol = biomeSymbolFromIndex(input.biomeIndex[idx]!);
        const feature =
          biomeSymbol === "boreal"
            ? "FEATURE_TAIGA"
            : biomeSymbol === "temperateDry"
              ? "FEATURE_SAVANNA_WOODLAND"
              : biomeSymbol === "desert"
                ? "FEATURE_SAGEBRUSH_STEPPE"
                : vegetation + clusterBonus > 0.75
                  ? "FEATURE_RAINFOREST"
                  : "FEATURE_FOREST";
        if (!FEATURE_PLACEMENT_KEYS.includes(feature as (typeof FEATURE_PLACEMENT_KEYS)[number])) {
          continue;
        }
        placements.push({ x, y, feature, weight });
      }
    }

    return { placements };
  },
});
