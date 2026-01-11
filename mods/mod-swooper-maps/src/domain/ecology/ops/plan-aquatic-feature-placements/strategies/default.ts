import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { clamp, clampChance, createLabelRng, rollPercent } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import PlanAquaticFeaturePlacementsContract from "../contract.js";
import { hasAdjacentFeatureType, isAdjacentToShallowWater } from "../rules/index.js";

type Config = Static<(typeof PlanAquaticFeaturePlacementsContract)["strategies"]["default"]>;
type Placement = Static<(typeof PlanAquaticFeaturePlacementsContract)["output"]>["placements"][number];

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const NO_FEATURE = -1;

function normalizeConfig(config: Config): Config {
  const chances = config.chances;
  const rules = config.rules;
  const atoll = rules.atoll;

  return {
    ...config,
    multiplier: Math.max(0, config.multiplier),
    chances: {
      FEATURE_REEF: clampChance(chances.FEATURE_REEF),
      FEATURE_COLD_REEF: clampChance(chances.FEATURE_COLD_REEF),
      FEATURE_ATOLL: clampChance(chances.FEATURE_ATOLL),
      FEATURE_LOTUS: clampChance(chances.FEATURE_LOTUS),
    },
    rules: {
      ...rules,
      reefLatitudeSplit: clamp(rules.reefLatitudeSplit, 0, 90),
      atoll: {
        enableClustering: atoll.enableClustering,
        clusterRadius: clamp(Math.floor(atoll.clusterRadius), 0, 2),
        equatorialBandMaxAbsLatitude: clamp(atoll.equatorialBandMaxAbsLatitude, 0, 90),
        shallowWaterAdjacencyGateChance: clampChance(atoll.shallowWaterAdjacencyGateChance),
        shallowWaterAdjacencyRadius: Math.max(1, Math.floor(atoll.shallowWaterAdjacencyRadius)),
        growthChanceEquatorial: clampChance(atoll.growthChanceEquatorial),
        growthChanceNonEquatorial: clampChance(atoll.growthChanceNonEquatorial),
      },
    },
  };
}

export const defaultStrategy = createStrategy(PlanAquaticFeaturePlacementsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const rng = createLabelRng(input.seed);

    const chances = config.chances;
    const rules = config.rules;
    const atollCfg = rules.atoll;
    const multiplier = config.multiplier;
    const reefLatitudeSplit = rules.reefLatitudeSplit;

    const { width, height, landMask, terrainType, latitude, featureKeyField, coastTerrain } = input;
    const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
    const getTerrainType = (x: number, y: number): number => terrainType[y * width + x];

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

    const reefChance = clampChance(chances.FEATURE_REEF! * multiplier);
    const coldReefChance = clampChance(chances.FEATURE_COLD_REEF! * multiplier);
    if (reefChance > 0 || coldReefChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          const absLat = Math.abs(latitude[y * width + x]);
          const useCold = absLat >= reefLatitudeSplit;
          const featureKey: FeatureKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const chance = useCold ? coldReefChance : reefChance;
          if (chance <= 0) continue;
          if (!rollPercent(rng, `features:plan:reef:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureKey);
        }
      }
    }

    const baseAtollChance = clampChance(chances.FEATURE_ATOLL! * multiplier);
    if (baseAtollChance > 0) {
      const atollIdx = FEATURE_KEY_INDEX.FEATURE_ATOLL;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollCfg.clusterRadius > 0) {
            if (hasAdjacentFeatureType(featureField, width, height, x, y, atollIdx, atollCfg.clusterRadius)) {
              const absLat = Math.abs(latitude[y * width + x]);
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

    const lotusChance = clampChance(chances.FEATURE_LOTUS! * multiplier);
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
