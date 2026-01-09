import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import {
  AquaticAtollSchema,
  AquaticChancesSchema,
  AquaticFeaturePlacementsConfigSchema,
  AquaticRulesSchema,
  PlanAquaticFeaturePlacementsContract,
} from "../contract.js";
import { hasAdjacentFeatureType, isAdjacentToShallowWater } from "../rules/index.js";

type AquaticFeatureKey =
  | "FEATURE_REEF"
  | "FEATURE_COLD_REEF"
  | "FEATURE_ATOLL"
  | "FEATURE_LOTUS";

type Config = Static<typeof AquaticFeaturePlacementsConfigSchema>;
type Input = Static<(typeof PlanAquaticFeaturePlacementsContract)["input"]>;
type Placement = Static<(typeof PlanAquaticFeaturePlacementsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  multiplier: number;
  chances: Record<AquaticFeatureKey, number>;
  rules: {
    reefLatitudeSplit: number;
    atoll: {
      enableClustering: boolean;
      clusterRadius: number;
      equatorialBandMaxAbsLatitude: number;
      shallowWaterAdjacencyGateChance: number;
      shallowWaterAdjacencyRadius: number;
      growthChanceEquatorial: number;
      growthChanceNonEquatorial: number;
    };
  };
};

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const readNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

const NO_FEATURE = -1;

const resolveConfig = (input: Config): ResolvedConfig => {
  const defaults = applySchemaDefaults(AquaticFeaturePlacementsConfigSchema, {}) as Required<Config>;
  const owned = applySchemaDefaults(AquaticFeaturePlacementsConfigSchema, input) as Required<Config>;

  const multiplier = Math.max(0, readNumber(owned.multiplier, defaults.multiplier));

  const chanceDefaults = applySchemaDefaults(AquaticChancesSchema, {}) as Record<string, number>;
  const chanceInput = applySchemaDefaults(AquaticChancesSchema, owned.chances) as Record<string, number>;
  const resolveChance = (key: AquaticFeatureKey): number =>
    clampChance(readNumber(chanceInput[key], chanceDefaults[key] ?? 0));

  const rulesDefaults = applySchemaDefaults(AquaticRulesSchema, {}) as Required<Static<typeof AquaticRulesSchema>>;
  const rulesInput = applySchemaDefaults(AquaticRulesSchema, owned.rules) as Required<Static<typeof AquaticRulesSchema>>;
  const atollDefaults = applySchemaDefaults(AquaticAtollSchema, {}) as Required<Static<typeof AquaticAtollSchema>>;
  const atollInput = applySchemaDefaults(AquaticAtollSchema, rulesInput.atoll) as Required<Static<typeof AquaticAtollSchema>>;

  return {
    multiplier,
    chances: {
      FEATURE_REEF: resolveChance("FEATURE_REEF"),
      FEATURE_COLD_REEF: resolveChance("FEATURE_COLD_REEF"),
      FEATURE_ATOLL: resolveChance("FEATURE_ATOLL"),
      FEATURE_LOTUS: resolveChance("FEATURE_LOTUS"),
    },
    rules: {
      reefLatitudeSplit: clamp(readNumber(rulesInput.reefLatitudeSplit, rulesDefaults.reefLatitudeSplit), 0, 90),
      atoll: {
        enableClustering: atollInput.enableClustering ?? atollDefaults.enableClustering,
        clusterRadius: clamp(Math.floor(readNumber(atollInput.clusterRadius, atollDefaults.clusterRadius)), 0, 2),
        equatorialBandMaxAbsLatitude: clamp(
          readNumber(atollInput.equatorialBandMaxAbsLatitude, atollDefaults.equatorialBandMaxAbsLatitude),
          0,
          90
        ),
        shallowWaterAdjacencyGateChance: clampChance(
          readNumber(atollInput.shallowWaterAdjacencyGateChance, atollDefaults.shallowWaterAdjacencyGateChance)
        ),
        shallowWaterAdjacencyRadius: Math.max(
          1,
          Math.floor(readNumber(atollInput.shallowWaterAdjacencyRadius, atollDefaults.shallowWaterAdjacencyRadius))
        ),
        growthChanceEquatorial: clampChance(readNumber(atollInput.growthChanceEquatorial, atollDefaults.growthChanceEquatorial)),
        growthChanceNonEquatorial: clampChance(
          readNumber(atollInput.growthChanceNonEquatorial, atollDefaults.growthChanceNonEquatorial)
        ),
      },
    },
  };
};

export const defaultStrategy = createStrategy(PlanAquaticFeaturePlacementsContract, "default", {
  resolveConfig,
  run: (input: Input, config: Config) => {
    const resolved = resolveConfig(config);
    const rng = createLabelRng(input.seed);

    const { width, height, landMask, terrainType, latitude, featureKeyField, coastTerrain } = input;
    const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x] ?? -1;

    const featureField = featureKeyField.slice();
    const placements: Placement[] = [];

    const canPlaceAt = (x: number, y: number): boolean => featureField[y * width + x] === NO_FEATURE;

    const setPlanned = (x: number, y: number, featureKey: FeatureKey): void => {
      const idx = y * width + x;
      const featureIdx = FEATURE_KEY_INDEX[featureKey];
      featureField[idx] = featureIdx;
      placements.push({ x, y, feature: featureKey });
    };

    if (resolved.multiplier <= 0) {
      return { placements };
    }

    const reefChance = clampChance(resolved.chances.FEATURE_REEF * resolved.multiplier);
    const coldReefChance = clampChance(resolved.chances.FEATURE_COLD_REEF * resolved.multiplier);
    if (reefChance > 0 || coldReefChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          const absLat = Math.abs(latitude[y * width + x] ?? 0);
          const useCold = absLat >= resolved.rules.reefLatitudeSplit;
          const featureKey: FeatureKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const chance = useCold ? coldReefChance : reefChance;
          if (chance <= 0) continue;
          if (!rollPercent(rng, `features:plan:reef:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    const baseAtollChance = clampChance(resolved.chances.FEATURE_ATOLL * resolved.multiplier);
    if (baseAtollChance > 0) {
      const atollCfg = resolved.rules.atoll;
      const atollIdx = FEATURE_KEY_INDEX.FEATURE_ATOLL;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollCfg.clusterRadius > 0) {
            if (hasAdjacentFeatureType(featureField, width, height, x, y, atollIdx, atollCfg.clusterRadius)) {
              const absLat = Math.abs(latitude[y * width + x] ?? 0);
              chance =
                absLat <= atollCfg.equatorialBandMaxAbsLatitude
                  ? atollCfg.growthChanceEquatorial
                  : atollCfg.growthChanceNonEquatorial;
            }
          }

          if (chance <= 0) continue;
          if (
            atollCfg.shallowWaterAdjacencyGateChance > 0 &&
            isAdjacentToShallowWater(getTerrainType, coastTerrain, width, height, x, y, atollCfg.shallowWaterAdjacencyRadius)
          ) {
            if (!rollPercent(rng, "features:plan:atoll:shallow-gate", atollCfg.shallowWaterAdjacencyGateChance)) {
              continue;
            }
          }
          if (!rollPercent(rng, "features:plan:atoll", clampChance(chance))) continue;
          setPlanned(x, y, "FEATURE_ATOLL");
        }
      }
    }

    const lotusChance = clampChance(resolved.chances.FEATURE_LOTUS * resolved.multiplier);
    if (lotusChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, "features:plan:lotus", lotusChance)) continue;
          setPlanned(x, y, "FEATURE_LOTUS");
        }
      }
    }

    return { placements };
  },
});
