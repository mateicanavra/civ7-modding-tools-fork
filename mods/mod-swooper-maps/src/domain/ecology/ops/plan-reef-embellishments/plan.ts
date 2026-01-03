import { createLabelRng } from "../rng.js";
import {
  FEATURE_PLACEMENT_KEYS,
  type FeatureKey,
} from "../plan-feature-placements/schema.js";
import type { ReefEmbellishmentPlacement, ReefEmbellishmentsInput } from "./types.js";
import type { ResolvedReefEmbellishmentsConfig } from "./schema.js";
import { planParadiseReefs } from "./rules/paradise-reefs.js";
import { planShelfReefs } from "./rules/shelf-reefs.js";

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const NO_FEATURE = -1;

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export function planReefEmbellishments(
  input: ReefEmbellishmentsInput,
  config: ResolvedReefEmbellishmentsConfig
): ReefEmbellishmentPlacement[] {
  const { width, height, landMask, featureKeyField, paradiseMask, passiveShelfMask } = input;
  const rng = createLabelRng(input.seed);
  const featureField = featureKeyField.slice();
  const placements: ReefEmbellishmentPlacement[] = [];

  const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
  const inBounds = (x: number, y: number): boolean => x >= 0 && x < width && y >= 0 && y < height;
  const canPlace = (x: number, y: number): boolean => featureField[y * width + x] === NO_FEATURE;

  const reefKey: FeatureKey = "FEATURE_REEF";
  const reefIdx = FEATURE_KEY_INDEX[reefKey];
  const place = (x: number, y: number): void => {
    const idx = y * width + x;
    featureField[idx] = reefIdx;
    placements.push({ x, y, feature: reefKey });
  };

  const featuresCfg = config.story.features;
  const densityCfg = config.featuresDensity;

  const paradiseReefChance = clampChance(featuresCfg.paradiseReefChance);
  const paradiseReefRadius = Math.max(0, Math.floor(featuresCfg.paradiseReefRadius));

  if (paradiseMask.some((value) => value === 1)) {
    planParadiseReefs({
      width,
      height,
      paradiseMask,
      inBounds,
      isWater,
      rng,
      paradiseReefChance,
      paradiseReefRadius,
      canPlace,
      place,
    });
  }

  const shelfReefMultiplier = Math.max(0, densityCfg.shelfReefMultiplier);
  const shelfReefRadius = Math.max(0, Math.floor(densityCfg.shelfReefRadius));
  const shelfReefChance = clampChance(paradiseReefChance * shelfReefMultiplier);

  if (passiveShelfMask.some((value) => value === 1)) {
    planShelfReefs({
      width,
      height,
      passiveShelfMask,
      inBounds,
      isWater,
      rng,
      shelfReefChance,
      shelfReefRadius,
      canPlace,
      place,
    });
  }

  return placements;
}
