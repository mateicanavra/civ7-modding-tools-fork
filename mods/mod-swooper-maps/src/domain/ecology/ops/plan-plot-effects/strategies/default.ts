import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";
import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import type { PlotEffectKey } from "@mapgen/domain/ecology/types.js";

import { biomeSymbolFromIndex } from "../../classify-biomes/index.js";
import { PlanPlotEffectsContract } from "../contract.js";
import { resolveSnowElevationRange } from "../snow-elevation.js";

type Config = Static<(typeof PlanPlotEffectsContract)["strategies"]["default"]>;
type Input = Static<(typeof PlanPlotEffectsContract)["input"]>;
type Placement = Static<(typeof PlanPlotEffectsContract)["output"]>["placements"][number];

type PlotEffectSelector = { typeName: PlotEffectKey };
type ResolvedConfig = {
  snow: Required<Config["snow"]> & {
    selectors: Required<NonNullable<Config["snow"]>["selectors"]>;
  };
  sand: Required<Config["sand"]> & { selector: PlotEffectSelector };
  burned: Required<Config["burned"]> & { selector: PlotEffectSelector };
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
};

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

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

const resolveConfig = (input: Config): ResolvedConfig => {
  const resolved = applySchemaDefaults(
    PlanPlotEffectsContract.strategies.default,
    input
  ) as ResolvedConfig;

  return {
    snow: {
      ...resolved.snow,
      selectors: {
        light: normalizeSelector(resolved.snow.selectors.light),
        medium: normalizeSelector(resolved.snow.selectors.medium),
        heavy: normalizeSelector(resolved.snow.selectors.heavy),
      },
    },
    sand: {
      ...resolved.sand,
      selector: normalizeSelector(resolved.sand.selector),
    },
    burned: {
      ...resolved.burned,
      selector: normalizeSelector(resolved.burned.selector),
    },
  };
};

const planPlotEffects = (input: Input, config: ResolvedConfig): Placement[] => {
  const { width, height, landMask } = input;
  const placements: Placement[] = [];
  const rng = createLabelRng(input.seed);

  const snowSelectors = {
    light: config.snow.selectors.light,
    medium: config.snow.selectors.medium,
    heavy: config.snow.selectors.heavy,
  };
  const sandSelector = config.sand.selector;
  const burnedSelector = config.burned.selector;

  const sandBiomeSet = new Set(config.sand.allowedBiomes);
  const burnedBiomeSet = new Set(config.burned.allowedBiomes);
  const snowEnabled = config.snow.enabled;
  const snowElevation = snowEnabled ? resolveSnowElevationRange(input, config) : null;
  const snowElevationMin = snowElevation?.min ?? config.snow.elevationMin;
  const snowElevationMax = snowElevation?.max ?? config.snow.elevationMax;

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
        if (temp <= config.snow.maxTemperature && aridity <= config.snow.maxAridity) {
          const elevationFactor = normalizeRange(elevation, snowElevationMin, snowElevationMax);
          const moistureFactor = normalizeRange(moisture, config.snow.moistureMin, config.snow.moistureMax);
          const scoreRaw =
            freeze * config.snow.freezeWeight +
            elevationFactor * config.snow.elevationWeight +
            moistureFactor * config.snow.moistureWeight +
            config.snow.scoreBias;
          const score = clamp01(scoreRaw / Math.max(0.0001, config.snow.scoreNormalization));

          if (score >= config.snow.lightThreshold) {
            if (rollPercent(rng, "plot-effects:plan:snow:coverage", config.snow.coverageChance)) {
              const typeToUse =
                score >= config.snow.heavyThreshold
                  ? snowSelectors.heavy.typeName
                  : score >= config.snow.mediumThreshold
                    ? snowSelectors.medium.typeName
                    : snowSelectors.light.typeName;

              placements.push({ x, y, plotEffect: typeToUse });
            }
          }
        }
      }

      if (config.sand.enabled) {
        if (
          aridity >= config.sand.minAridity &&
          temp >= config.sand.minTemperature &&
          freeze <= config.sand.maxFreeze &&
          vegetation <= config.sand.maxVegetation &&
          moisture <= config.sand.maxMoisture &&
          sandBiomeSet.has(symbol)
        ) {
          if (rollPercent(rng, "plot-effects:plan:sand", config.sand.chance)) {
            placements.push({ x, y, plotEffect: sandSelector.typeName });
          }
        }
      }

      if (config.burned.enabled) {
        if (
          aridity >= config.burned.minAridity &&
          temp >= config.burned.minTemperature &&
          moisture <= config.burned.maxMoisture &&
          freeze <= config.burned.maxFreeze &&
          burnedBiomeSet.has(symbol)
        ) {
          if (rollPercent(rng, "plot-effects:plan:burned", config.burned.chance)) {
            placements.push({ x, y, plotEffect: burnedSelector.typeName });
          }
        }
      }
    }
  }

  return placements;
};

export const defaultStrategy = createStrategy(PlanPlotEffectsContract, "default", {
  resolveConfig,
  run: (input: Input, config: Config) => ({ placements: planPlotEffects(input, resolveConfig(config)) }),
});
