import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, biomeSymbolFromIndex, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import { PlanVegetatedFeaturePlacementsContract } from "../contract.js";
import { pickVegetatedFeature } from "../rules/index.js";

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

const NO_FEATURE = -1;

export const defaultStrategy = createStrategy(PlanVegetatedFeaturePlacementsContract, "default", {
  run: (input, config) => {
    const rng = createLabelRng(input.seed);

    const { width, height, landMask, terrainType, featureKeyField, navigableRiverTerrain } = input;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x] ?? -1;
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

    const multiplier = Math.max(0, config.multiplier);
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

        const vegetationValue = input.vegetationDensity[idx] ?? 0;
        const symbolIndex = input.biomeIndex[idx] | 0;
        const minVeg = clamp01(minVegetationByBiome[biomeSymbolFromIndex(symbolIndex)]);
        if (vegetationValue < minVeg) continue;

        const featureKey = pickVegetatedFeature({
          symbolIndex,
          moistureValue: input.effectiveMoisture[idx] ?? 0,
          temperatureValue: input.surfaceTemperature[idx] ?? 0,
          vegetationValue,
          aridityIndex: input.aridityIndex[idx] ?? 0,
          freezeIndex: input.freezeIndex[idx] ?? 0,
          rules: {
            desertSagebrushMinVegetation: clamp01(rules.desertSagebrushMinVegetation),
            desertSagebrushMaxAridity: clamp01(rules.desertSagebrushMaxAridity),
            tundraTaigaMinVegetation: clamp01(rules.tundraTaigaMinVegetation),
            tundraTaigaMinTemperature: rules.tundraTaigaMinTemperature,
            tundraTaigaMaxFreeze: clamp01(rules.tundraTaigaMaxFreeze),
            temperateDryForestMoisture: rules.temperateDryForestMoisture,
            temperateDryForestMaxAridity: clamp01(rules.temperateDryForestMaxAridity),
            temperateDryForestVegetation: clamp01(rules.temperateDryForestVegetation),
            tropicalSeasonalRainforestMoisture: rules.tropicalSeasonalRainforestMoisture,
            tropicalSeasonalRainforestMaxAridity: clamp01(rules.tropicalSeasonalRainforestMaxAridity),
          },
        });
        if (!featureKey) continue;
        if (!canPlaceAt(x, y)) continue;

        const baseChance = clampChance((chances[featureKey] ?? 0) * multiplier);
        const vegetationScalar = clamp01(
          (vegetationValue ?? 0) * Math.max(0, rules.vegetationChanceScalar)
        );
        const chance = clampChance(baseChance * vegetationScalar);
        if (!rollPercent(rng, `features:plan:vegetated:${featureKey}`, chance)) continue;
        setPlanned(x, y, featureKey);
      }
    }

    return { placements };
  },
});
