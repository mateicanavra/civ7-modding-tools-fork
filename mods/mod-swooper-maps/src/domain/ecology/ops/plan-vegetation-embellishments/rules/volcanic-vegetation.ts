import type { BiomeSymbol, FeatureKey } from "../types.js";

export function planVolcanicVegetationAtTile(params: {
  width: number;
  height: number;
  x: number;
  y: number;
  rng: (label: string, max: number) => number;
  volcanicMask: Uint8Array;
  volcanicRadius: number;
  forestKey: FeatureKey;
  taigaKey: FeatureKey;
  forestChance: number;
  taigaChance: number;
  biome: BiomeSymbol;
  elevation: number;
  rainfall: number;
  latAbs: number;
  warmBiomes: ReadonlySet<BiomeSymbol>;
  tundraBiomes: ReadonlySet<BiomeSymbol>;
  forestMinRainfall: number;
  taigaMinLatitude: number;
  taigaMaxElevation: number;
  taigaMinRainfall: number;
  canPlace: (x: number, y: number) => boolean;
  place: (x: number, y: number, key: FeatureKey) => void;
}): boolean {
  const {
    width,
    height,
    x,
    y,
    rng,
    volcanicMask,
    volcanicRadius,
    forestKey,
    taigaKey,
    forestChance,
    taigaChance,
    biome,
    elevation,
    rainfall,
    latAbs,
    warmBiomes,
    tundraBiomes,
    forestMinRainfall,
    taigaMinLatitude,
    taigaMaxElevation,
    taigaMinRainfall,
    canPlace,
    place,
  } = params;

  if (volcanicRadius <= 0) return false;

  let nearVolcanic = false;
  for (let vdy = -volcanicRadius; vdy <= volcanicRadius && !nearVolcanic; vdy++) {
    for (let vdx = -volcanicRadius; vdx <= volcanicRadius; vdx++) {
      if (vdx === 0 && vdy === 0) continue;
      const vx = x + vdx;
      const vy = y + vdy;
      if (vx < 0 || vx >= width || vy < 0 || vy >= height) continue;
      if (volcanicMask[vy * width + vx] === 1) {
        nearVolcanic = true;
        break;
      }
    }
  }

  if (!nearVolcanic) return false;

  if (
    warmBiomes.has(biome) &&
    rainfall >= forestMinRainfall &&
    rng("features:plan:vegetation:volcanic-forest", 100) < forestChance
  ) {
    if (canPlace(x, y)) {
      place(x, y, forestKey);
      return true;
    }
  }

  if (
    tundraBiomes.has(biome) &&
    latAbs >= taigaMinLatitude &&
    elevation <= taigaMaxElevation &&
    rainfall >= taigaMinRainfall &&
    rng("features:plan:vegetation:volcanic-taiga", 100) < taigaChance
  ) {
    if (canPlace(x, y)) {
      place(x, y, taigaKey);
      return true;
    }
  }

  return false;
}
