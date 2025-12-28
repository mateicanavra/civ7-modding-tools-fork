import type { EngineAdapter } from "@civ7/adapter";
import { tryPlaceFeature } from "@mapgen/domain/ecology/features/place-feature.js";

export function applyVolcanicVegetationAtTile(params: {
  adapter: EngineAdapter;
  x: number;
  y: number;
  inBounds: (x: number, y: number) => boolean;
  getRandom: (label: string, max: number) => number;
  hotspotVolcanic: Set<string>;
  forestIdx: number;
  taigaIdx: number;
  volcanicForestChance: number;
  volcanicTaigaChance: number;
  biome: number;
  elevation: number;
  rainfall: number;
  latAbs: number;
  grasslandBiome: number;
  tropicalBiome: number;
  tundraBiome: number;
}): boolean {
  const {
    adapter,
    x,
    y,
    inBounds,
    getRandom,
    hotspotVolcanic,
    forestIdx,
    taigaIdx,
    volcanicForestChance,
    volcanicTaigaChance,
    biome,
    elevation,
    rainfall,
    latAbs,
    grasslandBiome,
    tropicalBiome,
    tundraBiome,
  } = params;

  if (hotspotVolcanic.size === 0) return false;

  let nearVolcanic = false;
  for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
    for (let vdx = -1; vdx <= 1; vdx++) {
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

  if (forestIdx !== -1 && rainfall > 95 && (biome === grasslandBiome || biome === tropicalBiome)) {
    if (getRandom("Volcanic Forest", 100) < volcanicForestChance) {
      if (tryPlaceFeature(adapter, x, y, forestIdx)) return true;
    }
  }

  if (taigaIdx !== -1 && latAbs >= 55 && biome === tundraBiome && elevation < 400 && rainfall > 60) {
    if (getRandom("Volcanic Taiga", 100) < volcanicTaigaChance) {
      if (tryPlaceFeature(adapter, x, y, taigaIdx)) return true;
    }
  }

  return false;
}
