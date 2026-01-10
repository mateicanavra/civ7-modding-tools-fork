import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { clamp, clampChance, createLabelRng, rollPercent } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import {
  AquaticFeaturePlacementsConfigSchema,
  PlanAquaticFeaturePlacementsContract,
} from "../contract.js";
import { hasAdjacentFeatureType, isAdjacentToShallowWater } from "../rules/index.js";

type Config = Static<typeof AquaticFeaturePlacementsConfigSchema>;
type Placement = Static<(typeof PlanAquaticFeaturePlacementsContract)["output"]>["placements"][number];

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const NO_FEATURE = -1;

function normalizeConfig(config: Config): Config {
  const chances = config.chances ?? {};
  const rules = config.rules ?? {};
  const atoll = rules.atoll ?? {};

  return {
    ...config,
    multiplier: Math.max(0, config.multiplier ?? 0),
    chances: {
      FEATURE_REEF: clampChance(chances.FEATURE_REEF ?? 0),
      FEATURE_COLD_REEF: clampChance(chances.FEATURE_COLD_REEF ?? 0),
      FEATURE_ATOLL: clampChance(chances.FEATURE_ATOLL ?? 0),
      FEATURE_LOTUS: clampChance(chances.FEATURE_LOTUS ?? 0),
    },
    rules: {
      ...rules,
      reefLatitudeSplit: clamp(rules.reefLatitudeSplit ?? 0, 0, 90),
      atoll: {
        enableClustering: atoll.enableClustering ?? true,
        clusterRadius: clamp(Math.floor(atoll.clusterRadius ?? 0), 0, 2),
        equatorialBandMaxAbsLatitude: clamp(atoll.equatorialBandMaxAbsLatitude ?? 0, 0, 90),
        shallowWaterAdjacencyGateChance: clampChance(atoll.shallowWaterAdjacencyGateChance ?? 0),
        shallowWaterAdjacencyRadius: Math.max(1, Math.floor(atoll.shallowWaterAdjacencyRadius ?? 1)),
        growthChanceEquatorial: clampChance(atoll.growthChanceEquatorial ?? 0),
        growthChanceNonEquatorial: clampChance(atoll.growthChanceNonEquatorial ?? 0),
      },
    },
  };
}

export const defaultStrategy = createStrategy(PlanAquaticFeaturePlacementsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const rng = createLabelRng(input.seed);

    const chances = config.chances ?? {};
    const rules = config.rules ?? {};
    const atollCfg = rules.atoll ?? {};
    const multiplier = config.multiplier ?? 0;
    const reefLatitudeSplit = rules.reefLatitudeSplit ?? 0;
    const atollClusterRadius = atollCfg.clusterRadius ?? 0;
    const atollEquatorialBandMaxAbsLatitude = atollCfg.equatorialBandMaxAbsLatitude ?? 0;
    const atollShallowWaterAdjacencyGateChance = atollCfg.shallowWaterAdjacencyGateChance ?? 0;
    const atollShallowWaterAdjacencyRadius = atollCfg.shallowWaterAdjacencyRadius ?? 1;
    const atollGrowthChanceEquatorial = atollCfg.growthChanceEquatorial ?? 0;
    const atollGrowthChanceNonEquatorial = atollCfg.growthChanceNonEquatorial ?? 0;

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

    if (multiplier <= 0) {
      return { placements };
    }

    const reefChance = clampChance((chances.FEATURE_REEF ?? 0) * multiplier);
    const coldReefChance = clampChance((chances.FEATURE_COLD_REEF ?? 0) * multiplier);
    if (reefChance > 0 || coldReefChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          const absLat = Math.abs(latitude[y * width + x] ?? 0);
          const useCold = absLat >= reefLatitudeSplit;
          const featureKey: FeatureKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const chance = useCold ? coldReefChance : reefChance;
          if (chance <= 0) continue;
          if (!rollPercent(rng, `features:plan:reef:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    const baseAtollChance = clampChance((chances.FEATURE_ATOLL ?? 0) * multiplier);
    if (baseAtollChance > 0) {
      const atollIdx = FEATURE_KEY_INDEX.FEATURE_ATOLL;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollClusterRadius > 0) {
            if (hasAdjacentFeatureType(featureField, width, height, x, y, atollIdx, atollClusterRadius)) {
              const absLat = Math.abs(latitude[y * width + x] ?? 0);
              chance =
                absLat <= atollEquatorialBandMaxAbsLatitude
                  ? atollGrowthChanceEquatorial
                  : atollGrowthChanceNonEquatorial;
            }
          }

          if (chance <= 0) continue;
          if (
            atollShallowWaterAdjacencyGateChance > 0 &&
            isAdjacentToShallowWater(
              getTerrainType,
              coastTerrain,
              width,
              height,
              x,
              y,
              atollShallowWaterAdjacencyRadius
            )
          ) {
            if (
              !rollPercent(
                rng,
                "features:plan:atoll:shallow-gate",
                atollShallowWaterAdjacencyGateChance
              )
            ) {
              continue;
            }
          }
          if (!rollPercent(rng, "features:plan:atoll", clampChance(chance))) continue;
          setPlanned(x, y, "FEATURE_ATOLL");
        }
      }
    }

    const lotusChance = clampChance((chances.FEATURE_LOTUS ?? 0) * multiplier);
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
