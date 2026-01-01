import type { EngineAdapter } from "@civ7/adapter";

export function planVolcanicVegetationAtTile(params: {
  adapter: EngineAdapter;
  x: number;
  y: number;
  inBounds: (x: number, y: number) => boolean;
  rand: (label: string, max: number) => number;
  hotspotVolcanic: Set<string>;
  forestIdx: number;
  taigaIdx: number;
  volcanicForestChance: number;
  volcanicTaigaChance: number;
  volcanicRadius: number;
  biome: number;
  elevation: number;
  rainfall: number;
  latAbs: number;
  grasslandBiome: number;
  tropicalBiome: number;
  tundraBiome: number;
  forestMinRainfall: number;
  taigaMinLatitude: number;
  taigaMaxElevation: number;
  taigaMinRainfall: number;
  canPlace: (x: number, y: number, featureIdx: number) => boolean;
  place: (x: number, y: number, featureIdx: number) => void;
}): boolean {
  const {
    adapter,
    x,
    y,
    inBounds,
    rand,
    hotspotVolcanic,
    forestIdx,
    taigaIdx,
    volcanicForestChance,
    volcanicTaigaChance,
    volcanicRadius,
    biome,
    elevation,
    rainfall,
    latAbs,
    grasslandBiome,
    tropicalBiome,
    tundraBiome,
    forestMinRainfall,
    taigaMinLatitude,
    taigaMaxElevation,
    taigaMinRainfall,
    canPlace,
    place,
  } = params;

  if (hotspotVolcanic.size === 0) return false;

  let nearVolcanic = false;
  for (let vdy = -volcanicRadius; vdy <= volcanicRadius && !nearVolcanic; vdy++) {
    for (let vdx = -volcanicRadius; vdx <= volcanicRadius; vdx++) {
      if (vdx === 0 && vdy === 0) continue;
      const vx = x + vdx;
      const vy = y + vdy;
      if (!inBounds(vx, vy)) continue;
      if (hotspotVolcanic.has(`${vx},${vy}`)) {
        nearVolcanic = true;
        break;
      }
    }
  }

  if (!nearVolcanic) return false;

  const warmBiome = biome === grasslandBiome || biome === tropicalBiome;
  if (
    forestIdx !== -1 &&
    warmBiome &&
    rainfall >= forestMinRainfall &&
    rand("Volcanic Forest", 100) < volcanicForestChance
  ) {
    if (canPlace(x, y, forestIdx)) {
      place(x, y, forestIdx);
      return true;
    }
  }

  if (
    taigaIdx !== -1 &&
    biome === tundraBiome &&
    latAbs >= taigaMinLatitude &&
    elevation <= taigaMaxElevation &&
    rainfall >= taigaMinRainfall &&
    rand("Volcanic Taiga", 100) < volcanicTaigaChance
  ) {
    if (canPlace(x, y, taigaIdx)) {
      place(x, y, taigaIdx);
      return true;
    }
  }

  return false;
}
