import type { LabelRng } from "@swooper/mapgen-core";
import type { BiomeSymbol, FeatureKey } from "../types.js";

export function planDensityTweaksAtTile(params: {
  x: number;
  y: number;
  rng: LabelRng;
  rainforestKey: FeatureKey;
  forestKey: FeatureKey;
  taigaKey: FeatureKey;
  rainfall: number;
  elevation: number;
  biome: BiomeSymbol;
  tropicalBiome: BiomeSymbol;
  grasslandBiomes: ReadonlySet<BiomeSymbol>;
  tundraBiomes: ReadonlySet<BiomeSymbol>;
  rainforestExtraChance: number;
  forestExtraChance: number;
  taigaExtraChance: number;
  rainforestMinRainfall: number;
  forestMinRainfall: number;
  taigaMaxElevation: number;
  canPlace: (x: number, y: number) => boolean;
  place: (x: number, y: number, key: FeatureKey) => void;
}): boolean {
  const {
    x,
    y,
    rng,
    rainforestKey,
    forestKey,
    taigaKey,
    rainfall,
    elevation,
    biome,
    tropicalBiome,
    grasslandBiomes,
    tundraBiomes,
    rainforestExtraChance,
    forestExtraChance,
    taigaExtraChance,
    rainforestMinRainfall,
    forestMinRainfall,
    taigaMaxElevation,
    canPlace,
    place,
  } = params;

  if (biome === tropicalBiome && rainfall >= rainforestMinRainfall) {
    if (
      rng(100, "features:plan:vegetation:rainforest") < rainforestExtraChance &&
      canPlace(x, y)
    ) {
      place(x, y, rainforestKey);
      return true;
    }
  }

  if (grasslandBiomes.has(biome) && rainfall >= forestMinRainfall) {
    if (
      rng(100, "features:plan:vegetation:forest") < forestExtraChance &&
      canPlace(x, y)
    ) {
      place(x, y, forestKey);
      return true;
    }
  }

  if (tundraBiomes.has(biome) && elevation <= taigaMaxElevation) {
    if (rng(100, "features:plan:vegetation:taiga") < taigaExtraChance && canPlace(x, y)) {
      place(x, y, taigaKey);
      return true;
    }
  }

  return false;
}
