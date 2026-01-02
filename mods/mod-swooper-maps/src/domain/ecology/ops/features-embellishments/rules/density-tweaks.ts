import type { EngineAdapter } from "@civ7/adapter";

export function planDensityTweaksAtTile(params: {
  adapter: EngineAdapter;
  x: number;
  y: number;
  rand: (label: string, max: number) => number;
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
  rainforestMinRainfall: number;
  forestMinRainfall: number;
  taigaMaxElevation: number;
  canPlace: (x: number, y: number, featureIdx: number) => boolean;
  place: (x: number, y: number, featureIdx: number) => void;
}): boolean {
  const {
    x,
    y,
    rand,
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
    rainforestMinRainfall,
    forestMinRainfall,
    taigaMaxElevation,
    canPlace,
    place,
  } = params;

  if (rainforestIdx !== -1 && biome === tropicalBiome && rainfall >= rainforestMinRainfall) {
    if (rand("Extra Jungle", 100) < rainforestExtraChance && canPlace(x, y, rainforestIdx)) {
      place(x, y, rainforestIdx);
      return true;
    }
  }

  if (forestIdx !== -1 && biome === grasslandBiome && rainfall >= forestMinRainfall) {
    if (rand("Extra Forest", 100) < forestExtraChance && canPlace(x, y, forestIdx)) {
      place(x, y, forestIdx);
      return true;
    }
  }

  if (taigaIdx !== -1 && biome === tundraBiome && elevation <= taigaMaxElevation) {
    if (rand("Extra Taiga", 100) < taigaExtraChance && canPlace(x, y, taigaIdx)) {
      place(x, y, taigaIdx);
      return true;
    }
  }

  return false;
}
