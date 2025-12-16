import type { ExtendedMapContext } from "../../../core/types.js";
import { ctxRandom, writeHeightfield } from "../../../core/types.js";
import { getStoryTags } from "../../narrative/tags/index.js";
import { COAST_TERRAIN, FLAT_TERRAIN, OCEAN_TERRAIN } from "../../../core/terrain-constants.js";
import type { CorridorsConfig, HotspotTunables, IslandsConfig } from "./types.js";
import { getFractalThreshold } from "./fractal-threshold.js";
import { isAdjacentToLand, isNearSeaLane, storyKey } from "./adjacency.js";

const HILL_FRACTAL = 1;

export function addIslandChains(iWidth: number, iHeight: number, ctx?: ExtendedMapContext | null): void {
  const adapter = ctx?.adapter;

  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 5, 0);
  }

  const islandsCfg = (ctx?.config?.islands as IslandsConfig) || {};
  const storyTunables = (ctx?.config?.story as { hotspot?: HotspotTunables }) || {};
  const corridorsCfg = (ctx?.config?.corridors as CorridorsConfig) || {};

  const fracPct = (islandsCfg.fractalThresholdPercent ?? 90) | 0;
  const threshold = getFractalThreshold(adapter, fracPct);

  const paradiseWeight = (storyTunables.hotspot?.paradiseBias ?? 2) | 0;
  const volcanicWeight = (storyTunables.hotspot?.volcanicBias ?? 1) | 0;
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round((storyTunables.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10)
  );

  const StoryTags = getStoryTags(ctx);

  const applyTerrain = (tileX: number, tileY: number, terrain: number, isLand: boolean): void => {
    if (ctx) {
      writeHeightfield(ctx, tileX, tileY, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(tileX, tileY, terrain);
    }
  };

  const getRandom = (label: string, max: number): number => {
    if (ctx) return ctxRandom(ctx, label, max);
    if (adapter) return adapter.getRandomNumber(max, label);
    return Math.floor(Math.random() * max);
  };

  const getFractalHeight = (x: number, y: number): number => {
    if (adapter?.getFractalHeight) return adapter.getFractalHeight(HILL_FRACTAL, x, y);
    return 0;
  };

  const isWater = (x: number, y: number): boolean => {
    if (adapter) return adapter.isWater(x, y);
    return true;
  };

  for (let y = 2; y < iHeight - 2; y++) {
    for (let x = 2; x < iWidth - 2; x++) {
      if (!isWater(x, y)) continue;

      const minDist = (islandsCfg.minDistFromLandRadius ?? 2) | 0;
      if (isAdjacentToLand(x, y, iWidth, iHeight, isWater, Math.max(0, minDist))) continue;

      const laneRadius = (corridorsCfg.sea?.avoidRadius ?? 2) | 0;
      if (isNearSeaLane(x, y, laneRadius, StoryTags.corridorSeaLane)) continue;

      const v = getFractalHeight(x, y);
      const isHotspot = StoryTags.hotspot.has(storyKey(x, y));

      let nearActive = false;
      let nearPassive = false;
      for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
        for (let mx = -1; mx <= 1; mx++) {
          if (mx === 0 && my === 0) continue;
          const k = storyKey(x + mx, y + my);
          if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
          if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
        }
      }

      const denActive = (islandsCfg.baseIslandDenNearActive ?? 5) | 0;
      const denElse = (islandsCfg.baseIslandDenElse ?? 7) | 0;
      const baseIslandDen = nearActive ? denActive : denElse;

      const baseAllowed = v > threshold && getRandom("Island Seed", baseIslandDen) === 0;
      const hotspotAllowed =
        isHotspot &&
        getRandom("Hotspot Island Seed", Math.max(1, (islandsCfg.hotspotSeedDenom ?? 2) | 0)) === 0;

      if (!(baseAllowed || hotspotAllowed)) continue;

      let centerTerrain = COAST_TERRAIN;
      let classifyParadise = false;

      if (isHotspot) {
        const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
        const vWeight = volcanicWeight;
        const bucket = pWeight + vWeight;
        const roll = getRandom("HotspotKind", bucket || 1);
        classifyParadise = roll < pWeight;

        if (!classifyParadise) {
          if (getRandom("HotspotPeak", 100) < peakPercent) {
            centerTerrain = FLAT_TERRAIN;
          }
        }
      }

      const centerIsLand = centerTerrain !== COAST_TERRAIN && centerTerrain !== OCEAN_TERRAIN;
      applyTerrain(x, y, centerTerrain, centerIsLand);

      if (isHotspot) {
        if (classifyParadise) {
          StoryTags.hotspotParadise.add(storyKey(x, y));
        } else {
          StoryTags.hotspotVolcanic.add(storyKey(x, y));
        }
      }

      const maxCluster = Math.max(1, (islandsCfg.clusterMax ?? 3) | 0);
      const count = 1 + getRandom("Island Size", maxCluster);

      for (let n = 0; n < count; n++) {
        const dx = getRandom("dx", 3) - 1;
        const dy = getRandom("dy", 3) - 1;
        const nx = x + dx;
        const ny = y + dy;

        if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
        if (!isWater(nx, ny)) continue;

        applyTerrain(nx, ny, COAST_TERRAIN, false);
      }
    }
  }
}
