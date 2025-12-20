import { isStageEnabled, validateStageDrift } from "@mapgen/bootstrap/resolved.js";
import type { MapGenConfig } from "@mapgen/config/index.js";

export type StageFlags = Record<string, boolean>;

export function resolveStageFlags(stageManifest: MapGenConfig["stageManifest"]): StageFlags {
  const flags = {
    foundation: isStageEnabled(stageManifest, "foundation"),
    landmassPlates: isStageEnabled(stageManifest, "landmassPlates"),
    coastlines: isStageEnabled(stageManifest, "coastlines"),
    storySeed: isStageEnabled(stageManifest, "storySeed"),
    storyHotspots: isStageEnabled(stageManifest, "storyHotspots"),
    storyRifts: isStageEnabled(stageManifest, "storyRifts"),
    ruggedCoasts: isStageEnabled(stageManifest, "ruggedCoasts"),
    storyOrogeny: isStageEnabled(stageManifest, "storyOrogeny"),
    storyCorridorsPre: isStageEnabled(stageManifest, "storyCorridorsPre"),
    islands: isStageEnabled(stageManifest, "islands"),
    mountains: isStageEnabled(stageManifest, "mountains"),
    volcanoes: isStageEnabled(stageManifest, "volcanoes"),
    lakes: isStageEnabled(stageManifest, "lakes"),
    climateBaseline: isStageEnabled(stageManifest, "climateBaseline"),
    storySwatches: isStageEnabled(stageManifest, "storySwatches"),
    rivers: isStageEnabled(stageManifest, "rivers"),
    storyCorridorsPost: isStageEnabled(stageManifest, "storyCorridorsPost"),
    climateRefine: isStageEnabled(stageManifest, "climateRefine"),
    biomes: isStageEnabled(stageManifest, "biomes"),
    features: isStageEnabled(stageManifest, "features"),
    placement: isStageEnabled(stageManifest, "placement"),
  };

  validateStageDrift(Object.keys(flags));

  return flags;
}

