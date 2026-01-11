import { clampChance, createLabelRng } from "@swooper/mapgen-core";
import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import { FEATURE_KEY_INDEX } from "@mapgen/domain/ecology/types.js";

import { PlanReefEmbellishmentsContract } from "../contract.js";
import { planParadiseReefs, planShelfReefs } from "../rules/index.js";

type Config = Static<(typeof PlanReefEmbellishmentsContract)["strategies"]["default"]>;
type Placement = Static<(typeof PlanReefEmbellishmentsContract)["output"]>["placements"][number];

const NO_FEATURE = -1;

function normalizeConfig(config: Config): Config {
  return {
    ...config,
    story: {
      ...config.story,
      features: {
        ...config.story.features,
        paradiseReefChance: clampChance(config.story.features.paradiseReefChance),
        paradiseReefRadius: Math.max(0, Math.floor(config.story.features.paradiseReefRadius)),
      },
    },
    featuresDensity: {
      ...config.featuresDensity,
      shelfReefMultiplier: Math.max(0, config.featuresDensity.shelfReefMultiplier),
      shelfReefRadius: Math.max(0, Math.floor(config.featuresDensity.shelfReefRadius)),
    },
  };
}

export const defaultStrategy = createStrategy(PlanReefEmbellishmentsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (input, config) => {
    const { width, height, landMask, featureKeyField, paradiseMask, passiveShelfMask } = input;
    const rng = createLabelRng(input.seed);
    const featureField = featureKeyField.slice();
    const placements: Placement[] = [];

    const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
    const inBounds = (x: number, y: number): boolean => x >= 0 && x < width && y >= 0 && y < height;
    const canPlace = (x: number, y: number): boolean => featureField[y * width + x] === NO_FEATURE;

    const place = (x: number, y: number): void => {
      const idx = y * width + x;
      featureField[idx] = FEATURE_KEY_INDEX["FEATURE_REEF"];
      placements.push({ x, y, feature: "FEATURE_REEF" });
    };

    const featuresCfg = config.story!.features!;
    const densityCfg = config.featuresDensity!;

    const paradiseReefChance = featuresCfg.paradiseReefChance;
    const paradiseReefRadius = featuresCfg.paradiseReefRadius;

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

    const shelfReefMultiplier = densityCfg.shelfReefMultiplier;
    const shelfReefRadius = densityCfg.shelfReefRadius;
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

    return {
      placements
    };
  },
});
