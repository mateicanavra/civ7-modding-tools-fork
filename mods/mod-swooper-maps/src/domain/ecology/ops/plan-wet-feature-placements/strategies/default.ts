import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";

import {
  FEATURE_PLACEMENT_KEYS,
  biomeSymbolFromIndex,
  type FeatureKey,
} from "@mapgen/domain/ecology/types.js";

import { PlanWetFeaturePlacementsContract } from "../contract.js";
import { hasAdjacentFeatureType, isCoastalLand } from "../rules/index.js";

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

type Config = Static<(typeof PlanWetFeaturePlacementsContract)["strategies"]["default"]>;

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

const NO_FEATURE = -1;

function normalizeRadius(value: number): number {
  return Math.max(1, Math.floor(value));
}

function normalizeConfig(config: Config): Config {
  const rules = config.rules;
  return {
    ...config,
    multiplier: Math.max(0, config.multiplier),
    chances: {
      FEATURE_MARSH: clampChance(config.chances.FEATURE_MARSH),
      FEATURE_TUNDRA_BOG: clampChance(config.chances.FEATURE_TUNDRA_BOG),
      FEATURE_MANGROVE: clampChance(config.chances.FEATURE_MANGROVE),
      FEATURE_OASIS: clampChance(config.chances.FEATURE_OASIS),
      FEATURE_WATERING_HOLE: clampChance(config.chances.FEATURE_WATERING_HOLE),
    },
    rules: {
      ...rules,
      nearRiverRadius: normalizeRadius(rules.nearRiverRadius),
      coastalAdjacencyRadius: normalizeRadius(rules.coastalAdjacencyRadius),
      isolatedRiverRadius: normalizeRadius(rules.isolatedRiverRadius),
      isolatedSpacingRadius: normalizeRadius(rules.isolatedSpacingRadius),
    },
  };
}

export const defaultStrategy = createStrategy(PlanWetFeaturePlacementsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const rng = createLabelRng(input.seed);

    const {
      width,
      height,
      biomeIndex,
      surfaceTemperature,
      landMask,
      terrainType,
      featureKeyField,
      nearRiverMask,
      isolatedRiverMask,
      navigableRiverTerrain,
    } = input;

    const featureField = featureKeyField.slice();
    const placements: Array<{ x: number; y: number; feature: FeatureKey }> = [];

    const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x] ?? -1;
    const isNavigableRiverPlot = (x: number, y: number): boolean =>
      navigableRiverTerrain >= 0 && getTerrainType(x, y) === navigableRiverTerrain;

    const canPlaceAt = (x: number, y: number): boolean =>
      featureField[y * width + x] === NO_FEATURE;

    const setPlanned = (x: number, y: number, featureKey: FeatureKey): void => {
      const idx = y * width + x;
      const featureIdx = FEATURE_KEY_INDEX[featureKey];
      featureField[idx] = featureIdx;
      placements.push({ x, y, feature: featureKey });
    };

    const multiplier = config.multiplier;
    if (multiplier <= 0) {
      return { placements };
    }

    const chances = config.chances;
    const rules = config.rules;

    const marshChance = clampChance(chances.FEATURE_MARSH * multiplier);
    const bogChance = clampChance(chances.FEATURE_TUNDRA_BOG * multiplier);
    if (marshChance > 0 || bogChance > 0) {
      const coldBiomeSet = new Set(rules.coldBiomeSymbols);
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (nearRiverMask[idx] !== 1) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isCold =
            coldBiomeSet.has(symbol) ||
            (surfaceTemperature[idx] ?? 0) <= rules.coldTemperatureMax;
          const featureKey: FeatureKey = isCold ? "FEATURE_TUNDRA_BOG" : "FEATURE_MARSH";
          const chance = isCold ? bogChance : marshChance;
          if (chance <= 0) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, `features:plan:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    const mangroveChance = clampChance(chances.FEATURE_MANGROVE * multiplier);
    if (mangroveChance > 0) {
      const warmBiomeSet = new Set(rules.mangroveWarmBiomeSymbols);
      const coastalRadius = rules.coastalAdjacencyRadius;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!isCoastalLand(isWater, width, height, x, y, coastalRadius)) {
            continue;
          }

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isWarm =
            warmBiomeSet.has(symbol) ||
            (surfaceTemperature[idx] ?? 0) >= rules.mangroveWarmTemperatureMin;
          if (!isWarm) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, "features:plan:wet:mangrove", mangroveChance)) continue;
          setPlanned(x, y, "FEATURE_MANGROVE");
        }
      }
    }

    const oasisChance = clampChance(chances.FEATURE_OASIS * multiplier);
    const wateringChance = clampChance(chances.FEATURE_WATERING_HOLE * multiplier);
    if (oasisChance > 0 || wateringChance > 0) {
      const oasisBiomeSet = new Set(rules.oasisBiomeSymbols);
      const oasisIdx = FEATURE_KEY_INDEX.FEATURE_OASIS;
      const wateringIdx = FEATURE_KEY_INDEX.FEATURE_WATERING_HOLE;
      const coastalRadius = rules.coastalAdjacencyRadius;
      const spacingRadius = rules.isolatedSpacingRadius;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (isCoastalLand(isWater, width, height, x, y, coastalRadius)) {
            continue;
          }
          if (isolatedRiverMask[idx] === 1) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const featureKey: FeatureKey = oasisBiomeSet.has(symbol) ? "FEATURE_OASIS" : "FEATURE_WATERING_HOLE";
          const featureIdx = featureKey === "FEATURE_OASIS" ? oasisIdx : wateringIdx;
          const chance = featureKey === "FEATURE_OASIS" ? oasisChance : wateringChance;
          if (chance <= 0) continue;
          if (!canPlaceAt(x, y)) continue;
          if (
            hasAdjacentFeatureType(
              featureField,
              width,
              height,
              x,
              y,
              featureIdx,
              spacingRadius
            )
          ) {
            continue;
          }
          if (!rollPercent(rng, `features:plan:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    return { placements };
  },
});
