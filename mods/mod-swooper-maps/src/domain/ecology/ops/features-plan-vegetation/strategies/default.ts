import { clamp01 } from "@swooper/mapgen-core";
import { createStrategy } from "@swooper/mapgen-core/authoring";
import PlanVegetationContract from "../contract.js";
import { FEATURE_PLACEMENT_KEYS, biomeSymbolFromIndex } from "@mapgen/domain/ecology/types.js";

export const defaultStrategy = createStrategy(PlanVegetationContract, "default", {
  run: (input, config) => {
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    const moistureNormalization = Math.max(0.0001, config.moistureNormalization ?? 230);
    const fertility = input.fertility;

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] === 0) continue;
        const vegetation = input.vegetationDensity[idx];
        if (vegetation <= 0) continue;
        const temp = input.surfaceTemperature[idx];
        if (temp < config.coldCutoff) continue;

        const fertilityValue = fertility[idx];
        const moisture = input.effectiveMoisture[idx];
        const moistureNorm = clamp01(moisture / moistureNormalization);
        const weight = clamp01(
          vegetation *
            (config.baseDensity +
              fertilityValue * config.fertilityWeight +
              moistureNorm * config.moistureWeight)
        );
        if (weight < 0.15) continue;

        const biomeSymbol = biomeSymbolFromIndex(input.biomeIndex[idx]);
        const feature =
          biomeSymbol === "boreal"
            ? "FEATURE_TAIGA"
            : biomeSymbol === "temperateDry"
              ? "FEATURE_SAVANNA_WOODLAND"
              : biomeSymbol === "desert"
                ? "FEATURE_SAGEBRUSH_STEPPE"
                : vegetation > 0.7
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
