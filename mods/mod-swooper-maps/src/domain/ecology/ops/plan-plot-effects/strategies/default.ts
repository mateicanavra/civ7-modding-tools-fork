import { clamp01, createLabelRng, normalizeRange, rollPercent } from "@swooper/mapgen-core";
import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import type { PlotEffectKey } from "@mapgen/domain/ecology/types.js";

import { biomeSymbolFromIndex } from "../../classify-biomes/index.js";
import { PlanPlotEffectsContract } from "../contract.js";
import { resolveSnowElevationRange } from "../rules/index.js";

type PlotEffectSelector = { typeName: PlotEffectKey };
type Config = Static<(typeof PlanPlotEffectsContract)["strategies"]["default"]>;

const normalizePlotEffectKey = (value: string): PlotEffectKey => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("plot effects selector typeName must be a non-empty string");
  }
  const upper = trimmed.toUpperCase();
  return (upper.startsWith("PLOTEFFECT_") ? upper : `PLOTEFFECT_${upper}`) as PlotEffectKey;
};

const normalizeSelector = (selector: { typeName: string }): PlotEffectSelector => ({
  typeName: normalizePlotEffectKey(selector.typeName),
});

function normalizeConfig(config: Config): Config {
  return {
    ...config,
    snow: {
      ...config.snow,
      selectors: {
        light: normalizeSelector(config.snow.selectors.light),
        medium: normalizeSelector(config.snow.selectors.medium),
        heavy: normalizeSelector(config.snow.selectors.heavy),
      },
    },
    sand: {
      ...config.sand,
      selector: normalizeSelector(config.sand.selector),
    },
    burned: {
      ...config.burned,
      selector: normalizeSelector(config.burned.selector),
    },
  };
}

export const defaultStrategy = createStrategy(PlanPlotEffectsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const { width, height, landMask } = input;
    const placements: Array<{ x: number; y: number; plotEffect: PlotEffectKey }> = [];
    const rng = createLabelRng(input.seed);

    const snow = config.snow;
    const sand = config.sand;
    const burned = config.burned;

    const snowSelectors = snow.selectors;
    const sandSelector = sand.selector;
    const burnedSelector = burned.selector;

    const sandBiomeSet = new Set(sand.allowedBiomes);
    const burnedBiomeSet = new Set(burned.allowedBiomes);
    const snowEnabled = snow.enabled;
    const snowElevation = snowEnabled
      ? resolveSnowElevationRange(input, {
          snow: {
            elevationStrategy: snow.elevationStrategy,
            elevationPercentileMin: snow.elevationPercentileMin,
            elevationPercentileMax: snow.elevationPercentileMax,
            elevationMin: snow.elevationMin,
            elevationMax: snow.elevationMax,
          },
        })
      : null;
    const snowElevationMin = snowElevation?.min ?? snow.elevationMin;
    const snowElevationMax = snowElevation?.max ?? snow.elevationMax;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (landMask[idx] === 0) continue;

        const temp = input.surfaceTemperature[idx] ?? 0;
        const moisture = input.effectiveMoisture[idx] ?? 0;
        const vegetation = input.vegetationDensity[idx] ?? 0;
        const aridity = input.aridityIndex[idx] ?? 0;
        const freeze = input.freezeIndex[idx] ?? 0;
        const elevation = input.elevation[idx] ?? 0;
        const symbol = biomeSymbolFromIndex(input.biomeIndex[idx] ?? 0);

        if (snowEnabled) {
          if (temp <= snow.maxTemperature && aridity <= snow.maxAridity) {
            const elevationFactor = normalizeRange(elevation, snowElevationMin, snowElevationMax);
            const moistureFactor = normalizeRange(moisture, snow.moistureMin, snow.moistureMax);
            const scoreRaw =
              freeze * snow.freezeWeight +
              elevationFactor * snow.elevationWeight +
              moistureFactor * snow.moistureWeight +
              snow.scoreBias;
            const score = clamp01(scoreRaw / Math.max(0.0001, snow.scoreNormalization));

            if (score >= snow.lightThreshold) {
              if (rollPercent(rng, "plot-effects:plan:snow:coverage", snow.coverageChance)) {
                const typeToUse =
                  score >= snow.heavyThreshold
                    ? snowSelectors.heavy.typeName
                    : score >= snow.mediumThreshold
                      ? snowSelectors.medium.typeName
                      : snowSelectors.light.typeName;

                placements.push({ x, y, plotEffect: typeToUse });
              }
            }
          }
        }

        if (sand.enabled) {
          if (
            aridity >= sand.minAridity &&
            temp >= sand.minTemperature &&
            freeze <= sand.maxFreeze &&
            vegetation <= sand.maxVegetation &&
            moisture <= sand.maxMoisture &&
            sandBiomeSet.has(symbol)
          ) {
            if (rollPercent(rng, "plot-effects:plan:sand", sand.chance)) {
              placements.push({ x, y, plotEffect: sandSelector.typeName });
            }
          }
        }

        if (burned.enabled) {
          if (
            aridity >= burned.minAridity &&
            temp >= burned.minTemperature &&
            moisture <= burned.maxMoisture &&
            freeze <= burned.maxFreeze &&
            burnedBiomeSet.has(symbol)
          ) {
            if (rollPercent(rng, "plot-effects:plan:burned", burned.chance)) {
              placements.push({ x, y, plotEffect: burnedSelector.typeName });
            }
          }
        }
      }
    }

    return { placements };
  },
});
