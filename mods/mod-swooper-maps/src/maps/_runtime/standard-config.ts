import type { RunSettings } from "@swooper/mapgen-core/engine";
import type { FoundationConfig, MapGenConfig } from "@mapgen/config";

import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import type { MapInitResolution } from "./map-init.js";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type StandardRecipeOverrides = DeepPartial<MapGenConfig>;

function resolveRunSeed(overrides: StandardRecipeOverrides): number {
  const seedConfig = overrides.foundation?.seed;
  if (seedConfig?.mode === "fixed" && typeof seedConfig.fixedSeed === "number") {
    return Math.trunc(seedConfig.fixedSeed);
  }
  return 0;
}

export function buildStandardRunSettings(
  init: MapInitResolution,
  overrides: StandardRecipeOverrides = {}
): RunSettings {
  const topLatitude = init.params.topLatitude ?? init.mapInfo.MaxLatitude ?? 0;
  const bottomLatitude = init.params.bottomLatitude ?? init.mapInfo.MinLatitude ?? 0;
  const wrapX = init.params.wrapX ?? true;
  const wrapY = init.params.wrapY ?? false;

  return {
    seed: resolveRunSeed(overrides),
    dimensions: { width: init.params.width, height: init.params.height },
    latitudeBounds: {
      topLatitude,
      bottomLatitude,
    },
    wrap: { wrapX, wrapY },
    directionality: overrides.foundation?.dynamics?.directionality ?? {},
  };
}

export function buildStandardRecipeConfig(
  overrides: StandardRecipeOverrides = {}
): StandardRecipeConfig {
  const foundationOverrides = overrides.foundation ?? {};
  const foundationConfig = {
    dynamics: {},
    ...foundationOverrides,
  } as FoundationConfig;
  const directionality = foundationConfig.dynamics?.directionality ?? {};

  return {
    foundation: {
      foundation: { foundation: foundationConfig },
    },
    "morphology-pre": {
      landmassPlates: {
        landmass: overrides.landmass ?? {},
        oceanSeparation: overrides.oceanSeparation ?? {},
      },
      coastlines: {},
    },
    "narrative-pre": {
      storySeed: { margins: overrides.margins ?? {} },
      storyHotspots: { story: { hotspot: overrides.story?.hotspot ?? {} } },
      storyRifts: { story: { rift: overrides.story?.rift ?? {} } },
    },
    "morphology-mid": {
      ruggedCoasts: {
        coastlines: overrides.coastlines ?? {},
        corridors: overrides.corridors ?? {},
      },
    },
    "narrative-mid": {
      storyOrogeny: { story: { orogeny: overrides.story?.orogeny ?? {} } },
      storyCorridorsPre: {
        corridors: overrides.corridors ?? {},
        foundation: { dynamics: { directionality } },
      },
    },
    "morphology-post": {
      islands: {
        islands: overrides.islands ?? {},
        story: { hotspot: overrides.story?.hotspot ?? {} },
        corridors: { sea: overrides.corridors?.sea ?? {} },
      },
      mountains: { mountains: overrides.mountains ?? {} },
      volcanoes: { volcanoes: overrides.volcanoes ?? {} },
    },
    "hydrology-pre": {
      lakes: {},
      climateBaseline: { climate: { baseline: overrides.climate?.baseline ?? {} } },
    },
    "narrative-swatches": {
      storySwatches: {
        climate: overrides.climate ?? {},
        foundation: { dynamics: { directionality } },
      },
    },
    "hydrology-core": {
      rivers: { climate: { story: { paleo: overrides.climate?.story?.paleo ?? {} } } },
    },
    "narrative-post": {
      storyCorridorsPost: {
        corridors: overrides.corridors ?? {},
        foundation: { dynamics: { directionality } },
      },
    },
    "hydrology-post": {
      climateRefine: {
        climate: overrides.climate ?? {},
        story: { orogeny: overrides.story?.orogeny ?? {} },
      },
    },
    ecology: {
      biomes: {
        thresholds: overrides.biomes?.thresholds ?? {},
        narrative: overrides.biomes?.narrative ?? {},
      },
      features: {
        story: { features: overrides.story?.features ?? {} },
        featuresDensity: overrides.featuresDensity ?? {},
      },
    },
    placement: {
      derivePlacementInputs: { placement: overrides.placement ?? {} },
      placement: {},
    },
  };
}
