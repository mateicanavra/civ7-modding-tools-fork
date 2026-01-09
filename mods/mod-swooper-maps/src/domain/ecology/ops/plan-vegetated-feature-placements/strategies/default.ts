import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, biomeSymbolFromIndex, type BiomeSymbol, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import {
  PlanVegetatedFeaturePlacementsContract,
  VegetatedChancesSchema,
  VegetatedFeaturePlacementsConfigSchema,
  VegetatedMinByBiomeSchema,
  VegetatedRulesSchema,
} from "../contract.js";
import { pickVegetatedFeature } from "../rules/index.js";

type Config = Static<typeof VegetatedFeaturePlacementsConfigSchema>;
type Input = Static<(typeof PlanVegetatedFeaturePlacementsContract)["input"]>;
type Placement =
  Static<(typeof PlanVegetatedFeaturePlacementsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  multiplier: number;
  chances: Partial<Record<FeatureKey, number>>;
  rules: {
    minVegetationByBiome: Record<BiomeSymbol, number>;
    vegetationChanceScalar: number;
    desertSagebrushMinVegetation: number;
    desertSagebrushMaxAridity: number;
    tundraTaigaMinVegetation: number;
    tundraTaigaMinTemperature: number;
    tundraTaigaMaxFreeze: number;
    temperateDryForestMoisture: number;
    temperateDryForestMaxAridity: number;
    temperateDryForestVegetation: number;
    tropicalSeasonalRainforestMoisture: number;
    tropicalSeasonalRainforestMaxAridity: number;
  };
};

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const readNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

const NO_FEATURE = -1;

const normalize = (input: Config): ResolvedConfig => {
  const defaults = applySchemaDefaults(VegetatedFeaturePlacementsConfigSchema, {}) as Required<Config>;
  const owned = applySchemaDefaults(VegetatedFeaturePlacementsConfigSchema, input) as Required<Config>;

  const multiplier = Math.max(0, readNumber(owned.multiplier, defaults.multiplier));

  const chanceDefaults = applySchemaDefaults(VegetatedChancesSchema, {}) as Record<string, number>;
  const chanceInput = applySchemaDefaults(VegetatedChancesSchema, owned.chances) as Record<string, number>;
  const resolveChance = (key: FeatureKey): number =>
    clampChance(readNumber(chanceInput[key], chanceDefaults[key] ?? 0));

  const rulesDefaults = applySchemaDefaults(VegetatedRulesSchema, {}) as Required<
    Static<typeof VegetatedRulesSchema>
  >;
  const rulesInput = applySchemaDefaults(VegetatedRulesSchema, owned.rules) as Required<
    Static<typeof VegetatedRulesSchema>
  >;
  const minVegDefaults = applySchemaDefaults(VegetatedMinByBiomeSchema, {}) as Record<
    string,
    number
  >;
  const minVegInput = applySchemaDefaults(
    VegetatedMinByBiomeSchema,
    rulesInput.minVegetationByBiome
  ) as Record<string, number>;
  const readMinVeg = (symbol: BiomeSymbol): number =>
    clamp01(readNumber(minVegInput[symbol], readNumber(minVegDefaults[symbol], 0)));

  return {
    multiplier,
    chances: {
      FEATURE_FOREST: resolveChance("FEATURE_FOREST"),
      FEATURE_RAINFOREST: resolveChance("FEATURE_RAINFOREST"),
      FEATURE_TAIGA: resolveChance("FEATURE_TAIGA"),
      FEATURE_SAVANNA_WOODLAND: resolveChance("FEATURE_SAVANNA_WOODLAND"),
      FEATURE_SAGEBRUSH_STEPPE: resolveChance("FEATURE_SAGEBRUSH_STEPPE"),
    },
    rules: {
      minVegetationByBiome: {
        snow: readMinVeg("snow"),
        tundra: readMinVeg("tundra"),
        boreal: readMinVeg("boreal"),
        temperateDry: readMinVeg("temperateDry"),
        temperateHumid: readMinVeg("temperateHumid"),
        tropicalSeasonal: readMinVeg("tropicalSeasonal"),
        tropicalRainforest: readMinVeg("tropicalRainforest"),
        desert: readMinVeg("desert"),
      },
      vegetationChanceScalar: Math.max(
        0,
        readNumber(rulesInput.vegetationChanceScalar, rulesDefaults.vegetationChanceScalar)
      ),
      desertSagebrushMinVegetation: clamp01(
        readNumber(
          rulesInput.desertSagebrushMinVegetation,
          rulesDefaults.desertSagebrushMinVegetation
        )
      ),
      desertSagebrushMaxAridity: clamp01(
        readNumber(
          rulesInput.desertSagebrushMaxAridity,
          rulesDefaults.desertSagebrushMaxAridity
        )
      ),
      tundraTaigaMinVegetation: clamp01(
        readNumber(rulesInput.tundraTaigaMinVegetation, rulesDefaults.tundraTaigaMinVegetation)
      ),
      tundraTaigaMinTemperature: readNumber(
        rulesInput.tundraTaigaMinTemperature,
        rulesDefaults.tundraTaigaMinTemperature
      ),
      tundraTaigaMaxFreeze: clamp01(
        readNumber(rulesInput.tundraTaigaMaxFreeze, rulesDefaults.tundraTaigaMaxFreeze)
      ),
      temperateDryForestMoisture: readNumber(
        rulesInput.temperateDryForestMoisture,
        rulesDefaults.temperateDryForestMoisture
      ),
      temperateDryForestMaxAridity: clamp01(
        readNumber(rulesInput.temperateDryForestMaxAridity, rulesDefaults.temperateDryForestMaxAridity)
      ),
      temperateDryForestVegetation: clamp01(
        readNumber(rulesInput.temperateDryForestVegetation, rulesDefaults.temperateDryForestVegetation)
      ),
      tropicalSeasonalRainforestMoisture: readNumber(
        rulesInput.tropicalSeasonalRainforestMoisture,
        rulesDefaults.tropicalSeasonalRainforestMoisture
      ),
      tropicalSeasonalRainforestMaxAridity: clamp01(
        readNumber(
          rulesInput.tropicalSeasonalRainforestMaxAridity,
          rulesDefaults.tropicalSeasonalRainforestMaxAridity
        )
      ),
    },
  };
};

export const defaultStrategy = createStrategy(PlanVegetatedFeaturePlacementsContract, "default", {
  normalize,
  run: (input: Input, config: Config) => {
    const resolved = normalize(config);
    const rng = createLabelRng(input.seed);

    const { width, height, landMask, terrainType, featureKeyField, navigableRiverTerrain } = input;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x] ?? -1;
    const isNavigableRiverPlot = (x: number, y: number): boolean =>
      navigableRiverTerrain >= 0 && getTerrainType(x, y) === navigableRiverTerrain;

    const featureField = featureKeyField.slice();
    const placements: Placement[] = [];

    const canPlaceAt = (x: number, y: number): boolean =>
      featureField[y * width + x] === NO_FEATURE;

    const setPlanned = (x: number, y: number, featureKey: FeatureKey): void => {
      const idx = y * width + x;
      const featureIdx = FEATURE_KEY_INDEX[featureKey];
      featureField[idx] = featureIdx;
      placements.push({ x, y, feature: featureKey });
    };

    if (resolved.multiplier > 0) {
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;

          const vegetationValue = input.vegetationDensity[idx] ?? 0;
          const symbolIndex = input.biomeIndex[idx] | 0;
          const minVeg = resolved.rules.minVegetationByBiome[biomeSymbolFromIndex(symbolIndex)];
          if (vegetationValue < minVeg) continue;

          const featureKey = pickVegetatedFeature({
            symbolIndex,
            moistureValue: input.effectiveMoisture[idx] ?? 0,
            temperatureValue: input.surfaceTemperature[idx] ?? 0,
            vegetationValue,
            aridityIndex: input.aridityIndex[idx] ?? 0,
            freezeIndex: input.freezeIndex[idx] ?? 0,
            rules: resolved.rules,
          });
          if (!featureKey) continue;
          if (!canPlaceAt(x, y)) continue;

          const baseChance = clampChance((resolved.chances[featureKey] ?? 0) * resolved.multiplier);
          const vegetationScalar = clamp01(
            (vegetationValue ?? 0) * resolved.rules.vegetationChanceScalar
          );
          const chance = clampChance(baseChance * vegetationScalar);
          if (!rollPercent(rng, `features:plan:vegetated:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    return { placements };
  },
});
