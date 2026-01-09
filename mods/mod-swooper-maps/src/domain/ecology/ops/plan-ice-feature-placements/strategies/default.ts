import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { createLabelRng, type LabelRng } from "@swooper/mapgen-core";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import {
  IceFeaturePlacementsConfigSchema,
  PlanIceFeaturePlacementsContract,
} from "../contract.js";
import { isAdjacentToLand } from "../rules/index.js";

type Config = Static<typeof IceFeaturePlacementsConfigSchema>;
type Input = Static<(typeof PlanIceFeaturePlacementsContract)["input"]>;
type Placement = Static<(typeof PlanIceFeaturePlacementsContract)["output"]>["placements"][number];

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const rollPercent = (rng: LabelRng, label: string, chance: number): boolean =>
  chance > 0 && rng(100, label) < chance;

const NO_FEATURE = -1;

export const defaultStrategy = createStrategy(PlanIceFeaturePlacementsContract, "default", {
  run: (input, config) => {
    const chances = config.chances!;
    const rules = config.rules!;
    const multiplier = Math.max(0, config.multiplier!);
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

    const minAbsLatitude = clamp(rules.minAbsLatitude!, 0, 90);
    const forbidAdjacentToLand = rules.forbidAdjacentToLand!;
    const landAdjacencyRadius = Math.max(1, Math.floor(rules.landAdjacencyRadius!));
    const forbidAdjacentToNaturalWonders = rules.forbidAdjacentToNaturalWonders!;
    const naturalWonderAdjacencyRadius = Math.max(1, Math.floor(rules.naturalWonderAdjacencyRadius!));

    if (multiplier > 0) {
      const iceChance = clampChance(chances.FEATURE_ICE! * multiplier);
      if (iceChance > 0) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (!isWater(x, y)) continue;
            if (!canPlaceAt(x, y)) continue;

            const absLat = Math.abs(latitude[y * width + x] ?? 0);
            if (absLat < minAbsLatitude) continue;
            if (
              forbidAdjacentToLand &&
              isAdjacentToLand(isWater, width, height, x, y, landAdjacencyRadius)
            ) {
              continue;
            }
            if (
              forbidAdjacentToNaturalWonders &&
              hasAdjacentNaturalWonder(x, y, naturalWonderAdjacencyRadius)
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
