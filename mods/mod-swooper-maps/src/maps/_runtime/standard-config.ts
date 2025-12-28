import type { RunSettings } from "@swooper/mapgen-core/engine";
import type { MapGenConfig } from "@swooper/mapgen-core/config";

import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import type { MapInitResolution } from "./map-init.js";

export type StandardRecipeOverrides = Partial<MapGenConfig>;

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
  return {
    seed: resolveRunSeed(overrides),
    dimensions: { width: init.params.width, height: init.params.height },
    latitudeBounds: {
      topLatitude: init.params.topLatitude,
      bottomLatitude: init.params.bottomLatitude,
    },
    wrap: { wrapX: init.params.wrapX, wrapY: init.params.wrapY },
    directionality: overrides.foundation?.dynamics?.directionality ?? {},
  };
}

export function buildStandardRecipeConfig(
  overrides: StandardRecipeOverrides = {}
): StandardRecipeConfig {
  return {
    foundation: {
      foundation: overrides.foundation ?? {},
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
      storyCorridorsPre: { corridors: overrides.corridors ?? {} },
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
      storySwatches: { climate: overrides.climate ?? {} },
    },
    "hydrology-core": {
      rivers: { climate: { story: { paleo: overrides.climate?.story?.paleo ?? {} } } },
    },
    "narrative-post": {
      storyCorridorsPost: { corridors: overrides.corridors ?? {} },
    },
    "hydrology-post": {
      climateRefine: {
        climate: overrides.climate ?? {},
        story: { orogeny: overrides.story?.orogeny ?? {} },
      },
    },
    ecology: {
      biomes: { biomes: overrides.biomes ?? {}, corridors: overrides.corridors ?? {} },
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
