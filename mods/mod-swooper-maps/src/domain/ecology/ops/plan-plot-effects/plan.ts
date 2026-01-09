import { biomeSymbolFromIndex } from "../classify-biomes/index.js";
import { type Static } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";
import {
  PlanPlotEffectsContract,
  type ResolvedPlotEffectsConfig,
} from "./contract.js";
import { resolveSnowElevationRange } from "./snow-elevation.js";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
};

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

type PlotEffectsInput = Static<typeof PlanPlotEffectsContract["input"]>;
type PlotEffectPlacement = Static<
  typeof PlanPlotEffectsContract["output"]
>["placements"][number];
type PlotEffectSelector = ResolvedPlotEffectsConfig["snow"]["selectors"]["light"];

const resolvePlotEffectKey = (selector: PlotEffectSelector): PlotEffectSelector => selector;

export function planPlotEffects(
  input: PlotEffectsInput,
  config: ResolvedPlotEffectsConfig
): PlotEffectPlacement[] {
  const { width, height, landMask } = input;
  const placements: PlotEffectPlacement[] = [];
  const rng = createLabelRng(input.seed);

  const snowSelectors = {
    light: resolvePlotEffectKey(config.snow.selectors.light),
    medium: resolvePlotEffectKey(config.snow.selectors.medium),
    heavy: resolvePlotEffectKey(config.snow.selectors.heavy),
  };
  const sandSelector = resolvePlotEffectKey(config.sand.selector);
  const burnedSelector = resolvePlotEffectKey(config.burned.selector);

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

      // --- Snow ---
      if (snowEnabled) {
        if (temp <= config.snow.maxTemperature && aridity <= config.snow.maxAridity) {
          const elevationFactor = normalizeRange(
            elevation,
            snowElevationMin,
            snowElevationMax
          );
          const moistureFactor = normalizeRange(
            moisture,
            config.snow.moistureMin,
            config.snow.moistureMax
          );
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

      // --- Sand ---
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

      // --- Burned ---
      if (config.burned.enabled) {
        if (
          aridity >= config.burned.minAridity &&
          temp >= config.burned.minTemperature &&
          freeze <= config.burned.maxFreeze &&
          vegetation <= config.burned.maxVegetation &&
          moisture <= config.burned.maxMoisture &&
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
}
