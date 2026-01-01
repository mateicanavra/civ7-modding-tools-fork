import { biomeSymbolFromIndex } from "../../classify-biomes.js";
import type { PlotEffectsInput, PlotEffectPlacement } from "../types.js";
import type {
  PlotEffectSelector,
  ResolvedPlotEffectsConfig,
} from "../schema.js";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
};

const rollPercent = (rand: (label: string, max: number) => number, label: string, chance: number): boolean =>
  chance > 0 && rand(label, 100) < chance;

const resolvePlotEffectType = (
  input: PlotEffectsInput,
  selector: PlotEffectSelector
): number => {
  const tags = selector.tags?.map((tag) => tag.toUpperCase()) ?? [];
  if (tags.length > 0) {
    const matches = input.adapter.getPlotEffectTypesContainingTags(tags);
    if (matches.length > 0) return matches[0] ?? -1;
  }
  if (selector.typeName) {
    return input.adapter.getPlotEffectTypeIndex(selector.typeName);
  }
  return -1;
};

export function planOwnedPlotEffects(
  input: PlotEffectsInput,
  config: ResolvedPlotEffectsConfig
): PlotEffectPlacement[] {
  const { width, height, adapter } = input;
  const placements: PlotEffectPlacement[] = [];

  const snowTypes = {
    light: resolvePlotEffectType(input, config.snow.selectors.light),
    medium: resolvePlotEffectType(input, config.snow.selectors.medium),
    heavy: resolvePlotEffectType(input, config.snow.selectors.heavy),
  };

  const sandType = resolvePlotEffectType(input, config.sand.selector);
  const burnedType = resolvePlotEffectType(input, config.burned.selector);

  const sandBiomeSet = new Set(config.sand.allowedBiomes);
  const burnedBiomeSet = new Set(config.burned.allowedBiomes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (adapter.isWater(x, y)) continue;

      const temp = input.surfaceTemperature[idx] ?? 0;
      const moisture = input.effectiveMoisture[idx] ?? 0;
      const vegetation = input.vegetationDensity[idx] ?? 0;
      const aridity = input.aridityIndex[idx] ?? 0;
      const freeze = input.freezeIndex[idx] ?? 0;
      const elevation = input.elevation[idx] ?? 0;
      const symbol = biomeSymbolFromIndex(input.biomeIndex[idx] ?? 0);

      // --- Snow ---
      if (config.snow.enabled && (snowTypes.light >= 0 || snowTypes.medium >= 0 || snowTypes.heavy >= 0)) {
        if (temp <= config.snow.maxTemperature && aridity <= config.snow.maxAridity) {
          const elevationFactor = normalizeRange(
            elevation,
            config.snow.elevationMin,
            config.snow.elevationMax
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
            if (rollPercent(input.rand, "plot-effects:snow:coverage", config.snow.coverageChance)) {
              const typeToUse =
                score >= config.snow.heavyThreshold
                  ? snowTypes.heavy
                  : score >= config.snow.mediumThreshold
                    ? snowTypes.medium
                    : snowTypes.light;

              if (typeToUse >= 0 && !adapter.hasPlotEffect(x, y, typeToUse)) {
                placements.push({ x, y, plotEffectType: typeToUse });
              }
            }
          }
        }
      }

      // --- Sand ---
      if (config.sand.enabled && sandType >= 0) {
        if (
          aridity >= config.sand.minAridity &&
          temp >= config.sand.minTemperature &&
          freeze <= config.sand.maxFreeze &&
          vegetation <= config.sand.maxVegetation &&
          moisture <= config.sand.maxMoisture &&
          sandBiomeSet.has(symbol) &&
          !adapter.hasPlotEffect(x, y, sandType)
        ) {
          if (rollPercent(input.rand, "plot-effects:sand", config.sand.chance)) {
            placements.push({ x, y, plotEffectType: sandType });
          }
        }
      }

      // --- Burned ---
      if (config.burned.enabled && burnedType >= 0) {
        if (
          aridity >= config.burned.minAridity &&
          temp >= config.burned.minTemperature &&
          freeze <= config.burned.maxFreeze &&
          vegetation <= config.burned.maxVegetation &&
          moisture <= config.burned.maxMoisture &&
          burnedBiomeSet.has(symbol) &&
          !adapter.hasPlotEffect(x, y, burnedType)
        ) {
          if (rollPercent(input.rand, "plot-effects:burned", config.burned.chance)) {
            placements.push({ x, y, plotEffectType: burnedType });
          }
        }
      }
    }
  }

  return placements;
}
