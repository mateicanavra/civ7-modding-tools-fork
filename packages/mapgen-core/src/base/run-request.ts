import type { MapInfo } from "@civ7/adapter";
import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { RecipeV1, RunRequest } from "@mapgen/pipeline/index.js";

function resolveRunSeed(config: MapGenConfig): number {
  const seedConfig = config.foundation?.seed;
  if (seedConfig?.mode === "fixed" && typeof seedConfig.fixedSeed === "number") {
    return Math.trunc(seedConfig.fixedSeed);
  }
  return 0;
}

function buildStepConfig(stepId: string, config: MapGenConfig): Record<string, unknown> {
  switch (stepId) {
    case "foundation":
      return { foundation: config.foundation ?? {} };
    case "landmassPlates":
      return {
        landmass: config.landmass ?? {},
        oceanSeparation: config.oceanSeparation ?? {},
      };
    case "coastlines":
    case "lakes":
      return {};
    case "ruggedCoasts":
      return {
        coastlines: config.coastlines ?? {},
        corridors: config.corridors ?? {},
      };
    case "islands":
      return {
        islands: config.islands ?? {},
        story: { hotspot: config.story?.hotspot ?? {} },
        corridors: { sea: config.corridors?.sea ?? {} },
      };
    case "mountains":
      return { mountains: config.mountains ?? {} };
    case "volcanoes":
      return { volcanoes: config.volcanoes ?? {} };
    case "climateBaseline":
      return { climate: { baseline: config.climate?.baseline ?? {} } };
    case "rivers":
      return { climate: { story: { paleo: config.climate?.story?.paleo ?? {} } } };
    case "climateRefine":
      return {
        climate: config.climate ?? {},
        story: { orogeny: config.story?.orogeny ?? {} },
      };
    case "storySeed":
      return { margins: config.margins ?? {} };
    case "storyHotspots":
      return { story: { hotspot: config.story?.hotspot ?? {} } };
    case "storyRifts":
      return {
        story: { rift: config.story?.rift ?? {} },
      };
    case "storyOrogeny":
      return { story: { orogeny: config.story?.orogeny ?? {} } };
    case "storyCorridorsPre":
    case "storyCorridorsPost":
      return {
        corridors: config.corridors ?? {},
      };
    case "storySwatches":
      return {
        climate: config.climate ?? {},
      };
    case "biomes":
      return { biomes: config.biomes ?? {}, corridors: config.corridors ?? {} };
    case "features":
      return {
        story: { features: config.story?.features ?? {} },
        featuresDensity: config.featuresDensity ?? {},
      };
    case "derivePlacementInputs":
      return { placement: config.placement ?? {} };
    case "placement":
      return {};
    default:
      return {};
  }
}

export function buildRunRequest(
  recipe: RecipeV1,
  config: MapGenConfig,
  ctx: ExtendedMapContext,
  mapInfo: MapInfo
): RunRequest {
  const steps = recipe.steps.map((step) => {
    const stepConfig = buildStepConfig(step.id, config);
    const mergedConfig =
      step.config && typeof step.config === "object"
        ? { ...stepConfig, ...step.config }
        : stepConfig;
    return {
      ...step,
      config: mergedConfig,
    };
  });

  return {
    recipe: {
      ...recipe,
      steps,
    },
    settings: {
      seed: resolveRunSeed(config),
      dimensions: { width: ctx.dimensions.width, height: ctx.dimensions.height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude ?? 90,
        bottomLatitude: mapInfo.MinLatitude ?? -90,
      },
      wrap: { wrapX: true, wrapY: false },
      directionality: config.foundation?.dynamics?.directionality ?? {},
    },
  };
}
