import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { ctxRandom, writeHeightfield } from "@swooper/mapgen-core";
import { buildNarrativeMotifsHotspotsV1 } from "@mapgen/domain/narrative/artifacts.js";
import {
  getNarrativeCorridors,
  getNarrativeMotifsHotspots,
  getNarrativeMotifsMargins,
} from "@mapgen/domain/narrative/queries.js";
import { COAST_TERRAIN, FLAT_TERRAIN, OCEAN_TERRAIN } from "@swooper/mapgen-core";
import type { CorridorsConfig, HotspotTunables, IslandsConfig } from "@mapgen/domain/morphology/islands/types.js";
import { getFractalThreshold } from "@mapgen/domain/morphology/islands/fractal-threshold.js";
import { isAdjacentToLand, isNearSeaLane, storyKey } from "@mapgen/domain/morphology/islands/adjacency.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/domain/tags.js";

const HILL_FRACTAL = 1;

export function addIslandChains(
  iWidth: number,
  iHeight: number,
  ctx: ExtendedMapContext,
  config: {
    islands: IslandsConfig;
    story: { hotspot: HotspotTunables };
    corridors: CorridorsConfig;
  }
): void {
  const adapter = ctx.adapter;

  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 5, 0);
  }

  const islandsCfg = config.islands;
  const storyTunables = config.story;
  const hotspotCfg = storyTunables.hotspot;
  if (!hotspotCfg) {
    throw new Error("[Islands] Missing story hotspot tunables.");
  }
  const corridorsCfg = config.corridors;
  const seaCfg = corridorsCfg.sea;
  if (!seaCfg) {
    throw new Error("[Islands] Missing sea corridor config.");
  }

  const fracPct = (islandsCfg.fractalThresholdPercent ?? 90) | 0;
  const threshold = getFractalThreshold(adapter, fracPct);

  const paradiseWeight = (hotspotCfg.paradiseBias ?? 2) | 0;
  const volcanicWeight = (hotspotCfg.volcanicBias ?? 1) | 0;
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round((hotspotCfg.volcanicPeakChance ?? 0.33) * 100) + 10)
  );

  const emptySet = new Set<string>();
  const corridors = getNarrativeCorridors(ctx);
  const margins = getNarrativeMotifsMargins(ctx);
  const hotspots = getNarrativeMotifsHotspots(ctx);
  const seaLanes = corridors?.seaLanes ?? emptySet;
  const activeMargin = margins?.activeMargin ?? emptySet;
  const passiveShelf = margins?.passiveShelf ?? emptySet;
  const hotspotPoints = hotspots?.points ?? emptySet;
  const paradise = new Set(hotspots?.paradise ?? []);
  const volcanic = new Set(hotspots?.volcanic ?? []);

  const applyTerrain = (tileX: number, tileY: number, terrain: number, isLand: boolean): void => {
    writeHeightfield(ctx, tileX, tileY, { terrain, isLand });
  };

  const getRandom = (label: string, max: number): number => ctxRandom(ctx, label, max);

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

      const laneRadius = (seaCfg.avoidRadius ?? 2) | 0;
      if (isNearSeaLane(x, y, laneRadius, seaLanes)) continue;

      const v = getFractalHeight(x, y);
      const isHotspot = hotspotPoints.has(storyKey(x, y));

      let nearActive = false;
      let nearPassive = false;
      for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
        for (let mx = -1; mx <= 1; mx++) {
          if (mx === 0 && my === 0) continue;
          const k = storyKey(x + mx, y + my);
          if (!nearActive && activeMargin.has(k)) nearActive = true;
          if (!nearPassive && passiveShelf.has(k)) nearPassive = true;
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
          paradise.add(storyKey(x, y));
        } else {
          volcanic.add(storyKey(x, y));
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

  ctx.artifacts.set(
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    buildNarrativeMotifsHotspotsV1({
      points: hotspotPoints,
      paradise,
      volcanic,
      trails: hotspots?.trails,
    })
  );
}
