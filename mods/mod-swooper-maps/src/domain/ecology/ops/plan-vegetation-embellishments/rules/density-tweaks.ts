import type { BiomeSymbol } from "../../../types.js";
import type { FeatureKey } from "../../plan-feature-placements/schema.js";

export function planDensityTweaksAtTile(params: {
  x: number;
  y: number;
  rng: (label: string, max: number) => number;
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
    if (rng("features:plan:vegetation:rainforest", 100) < rainforestExtraChance && canPlace(x, y)) {
      place(x, y, rainforestKey);
      return true;
    }
  }

  if (grasslandBiomes.has(biome) && rainfall >= forestMinRainfall) {
    if (rng("features:plan:vegetation:forest", 100) < forestExtraChance && canPlace(x, y)) {
      place(x, y, forestKey);
      return true;
    }
  }

  if (tundraBiomes.has(biome) && elevation <= taigaMaxElevation) {
    if (rng("features:plan:vegetation:taiga", 100) < taigaExtraChance && canPlace(x, y)) {
      place(x, y, taigaKey);
      return true;
    }
  }

  return false;
}
