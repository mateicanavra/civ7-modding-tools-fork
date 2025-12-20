import type { EngineAdapter } from "@civ7/adapter";
import { tryPlaceFeature } from "@mapgen/domain/ecology/features/place-feature.js";

export function applyDensityTweaksAtTile(params: {
  adapter: EngineAdapter;
  x: number;
  y: number;
  getRandom: (label: string, max: number) => number;
  rainforestIdx: number;
  forestIdx: number;
  taigaIdx: number;
  rainfall: number;
  elevation: number;
  biome: number;
  tropicalBiome: number;
  grasslandBiome: number;
  tundraBiome: number;
  rainforestExtraChance: number;
  forestExtraChance: number;
  taigaExtraChance: number;
}): boolean {
  const {
    adapter,
    x,
    y,
    getRandom,
    rainforestIdx,
    forestIdx,
    taigaIdx,
    rainfall,
    elevation,
    biome,
    tropicalBiome,
    grasslandBiome,
    tundraBiome,
    rainforestExtraChance,
    forestExtraChance,
    taigaExtraChance,
  } = params;

  if (rainforestIdx !== -1 && biome === tropicalBiome && rainfall > 130) {
    if (getRandom("Extra Jungle", 100) < rainforestExtraChance) {
      if (tryPlaceFeature(adapter, x, y, rainforestIdx)) return true;
    }
  }

  if (forestIdx !== -1 && biome === grasslandBiome && rainfall > 100) {
    if (getRandom("Extra Forest", 100) < forestExtraChance) {
      if (tryPlaceFeature(adapter, x, y, forestIdx)) return true;
    }
  }

  if (taigaIdx !== -1 && biome === tundraBiome && elevation < 300) {
    if (getRandom("Extra Taiga", 100) < taigaExtraChance) {
      if (tryPlaceFeature(adapter, x, y, taigaIdx)) return true;
    }
  }

  return false;
}

