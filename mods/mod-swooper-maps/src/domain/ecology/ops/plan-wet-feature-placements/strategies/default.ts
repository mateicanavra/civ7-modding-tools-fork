import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import {
  FEATURE_PLACEMENT_KEYS,
  biomeSymbolFromIndex,
  type BiomeSymbol,
  type FeatureKey,
} from "@mapgen/domain/ecology/types.js";

import { createLabelRng } from "../../rng.js";
import {
  PlanWetFeaturePlacementsContract,
  WetChancesSchema,
  WetFeaturePlacementsConfigSchema,
  WetRulesSchema,
} from "../contract.js";
import { hasAdjacentFeatureType, isCoastalLand } from "../rules/index.js";

type WetFeatureKey =
  | "FEATURE_MARSH"
  | "FEATURE_TUNDRA_BOG"
  | "FEATURE_MANGROVE"
  | "FEATURE_OASIS"
  | "FEATURE_WATERING_HOLE";

type Config = Static<typeof WetFeaturePlacementsConfigSchema>;
type Input = Static<(typeof PlanWetFeaturePlacementsContract)["input"]>;
type Placement = Static<(typeof PlanWetFeaturePlacementsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  multiplier: number;
  chances: Record<WetFeatureKey, number>;
  rules: {
    nearRiverRadius: number;
    coldTemperatureMax: number;
    coldBiomeSymbols: BiomeSymbol[];
    mangroveWarmTemperatureMin: number;
    mangroveWarmBiomeSymbols: BiomeSymbol[];
    coastalAdjacencyRadius: number;
    isolatedRiverRadius: number;
    isolatedSpacingRadius: number;
    oasisBiomeSymbols: BiomeSymbol[];
  };
};

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const readNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readSymbolArray = (
  input: BiomeSymbol[] | undefined,
  fallback: BiomeSymbol[]
): BiomeSymbol[] => (Array.isArray(input) && input.length > 0 ? input : fallback);

const rollPercent = (rng: (label: string, max: number) => number, label: string, chance: number): boolean =>
  chance > 0 && rng(label, 100) < chance;

const NO_FEATURE = -1;

const resolveConfig = (input: Config): ResolvedConfig => {
  const defaults = applySchemaDefaults(WetFeaturePlacementsConfigSchema, {}) as Required<Config>;
  const owned = applySchemaDefaults(WetFeaturePlacementsConfigSchema, input) as Required<Config>;

  const multiplier = Math.max(0, readNumber(owned.multiplier, defaults.multiplier));

  const chanceDefaults = applySchemaDefaults(WetChancesSchema, {}) as Record<string, number>;
  const chanceInput = applySchemaDefaults(WetChancesSchema, owned.chances) as Record<string, number>;
  const resolveChance = (key: WetFeatureKey): number =>
    clampChance(readNumber(chanceInput[key], chanceDefaults[key] ?? 0));

  const rulesDefaults = applySchemaDefaults(WetRulesSchema, {}) as Required<Static<typeof WetRulesSchema>>;
  const rulesInput = applySchemaDefaults(WetRulesSchema, owned.rules) as Required<Static<typeof WetRulesSchema>>;

  return {
    multiplier,
    chances: {
      FEATURE_MARSH: resolveChance("FEATURE_MARSH"),
      FEATURE_TUNDRA_BOG: resolveChance("FEATURE_TUNDRA_BOG"),
      FEATURE_MANGROVE: resolveChance("FEATURE_MANGROVE"),
      FEATURE_OASIS: resolveChance("FEATURE_OASIS"),
      FEATURE_WATERING_HOLE: resolveChance("FEATURE_WATERING_HOLE"),
    },
    rules: {
      nearRiverRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.nearRiverRadius, rulesDefaults.nearRiverRadius))
      ),
      coldTemperatureMax: readNumber(rulesInput.coldTemperatureMax, rulesDefaults.coldTemperatureMax),
      coldBiomeSymbols: readSymbolArray(rulesInput.coldBiomeSymbols, rulesDefaults.coldBiomeSymbols),
      mangroveWarmTemperatureMin: readNumber(
        rulesInput.mangroveWarmTemperatureMin,
        rulesDefaults.mangroveWarmTemperatureMin
      ),
      mangroveWarmBiomeSymbols: readSymbolArray(
        rulesInput.mangroveWarmBiomeSymbols,
        rulesDefaults.mangroveWarmBiomeSymbols
      ),
      coastalAdjacencyRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.coastalAdjacencyRadius, rulesDefaults.coastalAdjacencyRadius))
      ),
      isolatedRiverRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.isolatedRiverRadius, rulesDefaults.isolatedRiverRadius))
      ),
      isolatedSpacingRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.isolatedSpacingRadius, rulesDefaults.isolatedSpacingRadius))
      ),
      oasisBiomeSymbols: readSymbolArray(rulesInput.oasisBiomeSymbols, rulesDefaults.oasisBiomeSymbols),
    },
  };
};

export const defaultStrategy = createStrategy(PlanWetFeaturePlacementsContract, "default", {
  resolveConfig,
  run: (input: Input, config: Config) => {
    const resolved = resolveConfig(config);
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
    const placements: Placement[] = [];

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

    if (resolved.multiplier <= 0) {
      return { placements };
    }

    const marshChance = clampChance(resolved.chances.FEATURE_MARSH * resolved.multiplier);
    const bogChance = clampChance(resolved.chances.FEATURE_TUNDRA_BOG * resolved.multiplier);
    if (marshChance > 0 || bogChance > 0) {
      const coldBiomeSet = new Set(resolved.rules.coldBiomeSymbols);
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
            (surfaceTemperature[idx] ?? 0) <= resolved.rules.coldTemperatureMax;
          const featureKey: FeatureKey = isCold ? "FEATURE_TUNDRA_BOG" : "FEATURE_MARSH";
          const chance = isCold ? bogChance : marshChance;
          if (chance <= 0) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, `features:plan:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    const mangroveChance = clampChance(resolved.chances.FEATURE_MANGROVE * resolved.multiplier);
    if (mangroveChance > 0) {
      const warmBiomeSet = new Set(resolved.rules.mangroveWarmBiomeSymbols);
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!isCoastalLand(isWater, width, height, x, y, resolved.rules.coastalAdjacencyRadius)) {
            continue;
          }

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isWarm =
            warmBiomeSet.has(symbol) ||
            (surfaceTemperature[idx] ?? 0) >= resolved.rules.mangroveWarmTemperatureMin;
          if (!isWarm) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, "features:plan:wet:mangrove", mangroveChance)) continue;
          setPlanned(x, y, "FEATURE_MANGROVE");
        }
      }
    }

    const oasisChance = clampChance(resolved.chances.FEATURE_OASIS * resolved.multiplier);
    const wateringChance = clampChance(resolved.chances.FEATURE_WATERING_HOLE * resolved.multiplier);
    if (oasisChance > 0 || wateringChance > 0) {
      const oasisBiomeSet = new Set(resolved.rules.oasisBiomeSymbols);
      const oasisIdx = FEATURE_KEY_INDEX.FEATURE_OASIS;
      const wateringIdx = FEATURE_KEY_INDEX.FEATURE_WATERING_HOLE;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (isCoastalLand(isWater, width, height, x, y, resolved.rules.coastalAdjacencyRadius)) {
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
              resolved.rules.isolatedSpacingRadius
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
