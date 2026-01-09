import { createLabelRng } from "@swooper/mapgen-core";
import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";

import { EcologyConfigSchema } from "../../../config.js";
import { PlanReefEmbellishmentsContract } from "../contract.js";
import { planParadiseReefs } from "../rules/paradise-reefs.js";
import { planShelfReefs } from "../rules/shelf-reefs.js";

type Config = Static<(typeof PlanReefEmbellishmentsContract)["strategies"]["default"]>;
type Input = Static<(typeof PlanReefEmbellishmentsContract)["input"]>;
type Placement = Static<(typeof PlanReefEmbellishmentsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  story: { features: Required<Static<(typeof EcologyConfigSchema)["properties"]["features"]>> };
  featuresDensity: Required<Static<(typeof EcologyConfigSchema)["properties"]["featuresDensity"]>>;
};

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const NO_FEATURE = -1;

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const normalize = (config: Config): ResolvedConfig =>
  applySchemaDefaults(PlanReefEmbellishmentsContract.strategies.default, config) as ResolvedConfig;

const planReefEmbellishments = (input: Input, config: ResolvedConfig): Placement[] => {
  const { width, height, landMask, featureKeyField, paradiseMask, passiveShelfMask } = input;
  const rng = createLabelRng(input.seed);
  const featureField = featureKeyField.slice();
  const placements: Placement[] = [];

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
};

export const defaultStrategy = createStrategy(PlanReefEmbellishmentsContract, "default", {
  normalize,
  run: (input: Input, config: Config) => ({ placements: planReefEmbellishments(input, normalize(config)) }),
});
