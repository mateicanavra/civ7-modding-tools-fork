import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { clamp01, clampChance, createLabelRng, rollPercent } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, biomeSymbolFromIndex, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import { PlanVegetatedFeaturePlacementsContract } from "../contract.js";
import { pickVegetatedFeature } from "../rules/index.js";

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

type Config = Static<(typeof PlanVegetatedFeaturePlacementsContract)["strategies"]["default"]>;

const NO_FEATURE = -1;

function normalizeConfig(config: Config): Config {
  const rules = config.rules;
  return {
    ...config,
    multiplier: Math.max(0, config.multiplier),
    chances: {
      FEATURE_FOREST: clampChance(config.chances.FEATURE_FOREST),
      FEATURE_RAINFOREST: clampChance(config.chances.FEATURE_RAINFOREST),
      FEATURE_TAIGA: clampChance(config.chances.FEATURE_TAIGA),
      FEATURE_SAVANNA_WOODLAND: clampChance(config.chances.FEATURE_SAVANNA_WOODLAND),
      FEATURE_SAGEBRUSH_STEPPE: clampChance(config.chances.FEATURE_SAGEBRUSH_STEPPE),
    },
    rules: {
      ...rules,
      minVegetationByBiome: {
        snow: clamp01(rules.minVegetationByBiome.snow),
        tundra: clamp01(rules.minVegetationByBiome.tundra),
        boreal: clamp01(rules.minVegetationByBiome.boreal),
        temperateDry: clamp01(rules.minVegetationByBiome.temperateDry),
        temperateHumid: clamp01(rules.minVegetationByBiome.temperateHumid),
        tropicalSeasonal: clamp01(rules.minVegetationByBiome.tropicalSeasonal),
        tropicalRainforest: clamp01(rules.minVegetationByBiome.tropicalRainforest),
        desert: clamp01(rules.minVegetationByBiome.desert),
      },
      vegetationChanceScalar: Math.max(0, rules.vegetationChanceScalar),
      desertSagebrushMinVegetation: clamp01(rules.desertSagebrushMinVegetation),
      desertSagebrushMaxAridity: clamp01(rules.desertSagebrushMaxAridity),
      tundraTaigaMinVegetation: clamp01(rules.tundraTaigaMinVegetation),
      tundraTaigaMaxFreeze: clamp01(rules.tundraTaigaMaxFreeze),
      temperateDryForestMaxAridity: clamp01(rules.temperateDryForestMaxAridity),
      temperateDryForestVegetation: clamp01(rules.temperateDryForestVegetation),
      tropicalSeasonalRainforestMaxAridity: clamp01(rules.tropicalSeasonalRainforestMaxAridity),
    },
  };
}

export const defaultStrategy = createStrategy(PlanVegetatedFeaturePlacementsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const rng = createLabelRng(input.seed);

    const { width, height, landMask, terrainType, featureKeyField, navigableRiverTerrain } = input;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x];
    const isNavigableRiverPlot = (x: number, y: number): boolean =>
      navigableRiverTerrain >= 0 && getTerrainType(x, y) === navigableRiverTerrain;

    const featureField = featureKeyField.slice();
    const placements: Array<{ x: number; y: number; feature: FeatureKey }> = [];

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
    const minVegetationByBiome = rules.minVegetationByBiome;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (landMask[idx] === 0) continue;
        if (isNavigableRiverPlot(x, y)) continue;

        const vegetationValue = input.vegetationDensity[idx];
        const symbolIndex = input.biomeIndex[idx] | 0;
        const minVeg = minVegetationByBiome[biomeSymbolFromIndex(symbolIndex)];
        if (vegetationValue < minVeg) continue;

        const featureKey = pickVegetatedFeature({
          symbolIndex,
          moistureValue: input.effectiveMoisture[idx],
          temperatureValue: input.surfaceTemperature[idx],
          vegetationValue,
          aridityIndex: input.aridityIndex[idx],
          freezeIndex: input.freezeIndex[idx],
          rules: {
            desertSagebrushMinVegetation: rules.desertSagebrushMinVegetation,
            desertSagebrushMaxAridity: rules.desertSagebrushMaxAridity,
            tundraTaigaMinVegetation: rules.tundraTaigaMinVegetation,
            tundraTaigaMinTemperature: rules.tundraTaigaMinTemperature,
            tundraTaigaMaxFreeze: rules.tundraTaigaMaxFreeze,
            temperateDryForestMoisture: rules.temperateDryForestMoisture,
            temperateDryForestMaxAridity: rules.temperateDryForestMaxAridity,
            temperateDryForestVegetation: rules.temperateDryForestVegetation,
            tropicalSeasonalRainforestMoisture: rules.tropicalSeasonalRainforestMoisture,
            tropicalSeasonalRainforestMaxAridity: rules.tropicalSeasonalRainforestMaxAridity,
          },
        });
        if (!featureKey) continue;
        if (!canPlaceAt(x, y)) continue;

        const baseChance = clampChance(chances[featureKey] * multiplier);
        const vegetationScalar = clamp01(vegetationValue * rules.vegetationChanceScalar);
        const chance = clampChance(baseChance * vegetationScalar);
        if (!rollPercent(rng, `features:plan:vegetated:${featureKey}`, chance)) continue;
        setPlanned(x, y, featureKey);
      }
    }

    return { placements };
  },
});
