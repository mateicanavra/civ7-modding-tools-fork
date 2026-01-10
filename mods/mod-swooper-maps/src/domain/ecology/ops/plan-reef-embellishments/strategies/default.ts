import { clampChance, createLabelRng } from "@swooper/mapgen-core";
import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import { FEATURE_KEY_INDEX } from "@mapgen/domain/ecology/types.js";

import { PlanReefEmbellishmentsContract } from "../contract.js";
import { planParadiseReefs, planShelfReefs } from "../rules/index.js";

type Config = Static<(typeof PlanReefEmbellishmentsContract)["strategies"]["default"]>;
type Placement = Static<(typeof PlanReefEmbellishmentsContract)["output"]>["placements"][number];

const NO_FEATURE = -1;

function normalizeConfig(config: Config): Config {
  const story = config.story ?? { features: {} };
  const storyFeatures = story.features ?? {};
  const featuresDensity = config.featuresDensity ?? {};

  return {
    ...config,
    story: {
      ...story,
      features: {
        ...storyFeatures,
        paradiseReefChance: clampChance(storyFeatures.paradiseReefChance ?? 0),
        paradiseReefRadius: Math.max(0, Math.floor(storyFeatures.paradiseReefRadius ?? 0)),
      },
    },
    featuresDensity: {
      ...featuresDensity,
      shelfReefMultiplier: Math.max(0, featuresDensity.shelfReefMultiplier ?? 0),
      shelfReefRadius: Math.max(0, Math.floor(featuresDensity.shelfReefRadius ?? 0)),
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

    const featuresCfg = config.story?.features ?? {
      paradiseReefChance: 0,
      paradiseReefRadius: 0,
    };
    const densityCfg = config.featuresDensity ?? {
      shelfReefMultiplier: 0,
      shelfReefRadius: 0,
    };

    const paradiseReefChance = featuresCfg.paradiseReefChance ?? 0;
    const paradiseReefRadius = featuresCfg.paradiseReefRadius ?? 0;

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

    const shelfReefMultiplier = densityCfg.shelfReefMultiplier ?? 0;
    const shelfReefRadius = densityCfg.shelfReefRadius ?? 0;
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
      placements,
    };
  },
});
