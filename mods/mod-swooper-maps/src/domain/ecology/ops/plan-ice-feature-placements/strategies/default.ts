import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";

import { createLabelRng } from "../../rng.js";
import {
  IceChancesSchema,
  IceFeaturePlacementsConfigSchema,
  IceRulesSchema,
  PlanIceFeaturePlacementsContract,
} from "../contract.js";
import { isAdjacentToLand } from "../rules/index.js";

type Config = Static<typeof IceFeaturePlacementsConfigSchema>;
type Input = Static<(typeof PlanIceFeaturePlacementsContract)["input"]>;
type Placement = Static<(typeof PlanIceFeaturePlacementsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  multiplier: number;
  chances: { FEATURE_ICE: number };
  rules: {
    minAbsLatitude: number;
    forbidAdjacentToLand: boolean;
    landAdjacencyRadius: number;
    forbidAdjacentToNaturalWonders: boolean;
    naturalWonderAdjacencyRadius: number;
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

const rollPercent = (rng: (label: string, max: number) => number, label: string, chance: number): boolean =>
  chance > 0 && rng(label, 100) < chance;

const NO_FEATURE = -1;

const resolveConfig = (input: Config): ResolvedConfig => {
  const defaults = applySchemaDefaults(IceFeaturePlacementsConfigSchema, {}) as Required<Config>;
  const owned = applySchemaDefaults(IceFeaturePlacementsConfigSchema, input) as Required<Config>;

  const multiplier = Math.max(0, readNumber(owned.multiplier, defaults.multiplier));

  const chanceDefaults = applySchemaDefaults(IceChancesSchema, {}) as Record<string, number>;
  const chanceInput = applySchemaDefaults(IceChancesSchema, owned.chances) as Record<string, number>;

  const rulesDefaults = applySchemaDefaults(IceRulesSchema, {}) as Required<Static<typeof IceRulesSchema>>;
  const rulesInput = applySchemaDefaults(IceRulesSchema, owned.rules) as Required<Static<typeof IceRulesSchema>>;

  return {
    multiplier,
    chances: {
      FEATURE_ICE: clampChance(readNumber(chanceInput.FEATURE_ICE, chanceDefaults.FEATURE_ICE ?? 0)),
    },
    rules: {
      minAbsLatitude: clamp(readNumber(rulesInput.minAbsLatitude, rulesDefaults.minAbsLatitude), 0, 90),
      forbidAdjacentToLand: rulesInput.forbidAdjacentToLand ?? rulesDefaults.forbidAdjacentToLand,
      landAdjacencyRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.landAdjacencyRadius, rulesDefaults.landAdjacencyRadius))
      ),
      forbidAdjacentToNaturalWonders:
        rulesInput.forbidAdjacentToNaturalWonders ?? rulesDefaults.forbidAdjacentToNaturalWonders,
      naturalWonderAdjacencyRadius: Math.max(
        1,
        Math.floor(readNumber(rulesInput.naturalWonderAdjacencyRadius, rulesDefaults.naturalWonderAdjacencyRadius))
      ),
    },
  };
};

export const defaultStrategy = createStrategy(PlanIceFeaturePlacementsContract, "default", {
  resolveConfig,
  run: (input: Input, config: Config) => {
    const resolved = resolveConfig(config);
    const rng = createLabelRng(input.seed);

    const { width, height, landMask, latitude, featureKeyField, naturalWonderMask } = input;
    const featureField = featureKeyField.slice();
    const placements: Placement[] = [];

    const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
    const canPlaceAt = (x: number, y: number): boolean => featureField[y * width + x] === NO_FEATURE;

    const hasAdjacentNaturalWonder = (x: number, y: number, radius: number): boolean => {
      if (radius <= 0) return false;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (dx === 0 && dy === 0) continue;
          if (naturalWonderMask[ny * width + nx] === 1) return true;
        }
      }
      return false;
    };

    const setPlanned = (x: number, y: number, featureKey: FeatureKey): void => {
      const idx = y * width + x;
      const featureIdx = FEATURE_KEY_INDEX[featureKey];
      featureField[idx] = featureIdx;
      placements.push({ x, y, feature: featureKey });
    };

    if (resolved.multiplier > 0) {
      const iceChance = clampChance(resolved.chances.FEATURE_ICE * resolved.multiplier);
      if (iceChance > 0) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (!isWater(x, y)) continue;
            if (!canPlaceAt(x, y)) continue;

            const absLat = Math.abs(latitude[y * width + x] ?? 0);
            if (absLat < resolved.rules.minAbsLatitude) continue;
            if (
              resolved.rules.forbidAdjacentToLand &&
              isAdjacentToLand(isWater, width, height, x, y, resolved.rules.landAdjacencyRadius)
            ) {
              continue;
            }
            if (
              resolved.rules.forbidAdjacentToNaturalWonders &&
              hasAdjacentNaturalWonder(x, y, resolved.rules.naturalWonderAdjacencyRadius)
            ) {
              continue;
            }
            if (!rollPercent(rng, "features:plan:ice", iceChance)) continue;
            setPlanned(x, y, "FEATURE_ICE");
          }
        }
      }
    }

    return { placements };
  },
});

