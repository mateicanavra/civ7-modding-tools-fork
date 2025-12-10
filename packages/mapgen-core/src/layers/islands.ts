/**
 * Islands Layer — addIslandChains
 *
 * Seeds tiny offshore island clusters using a sparse fractal mask, with
 * additional alignment/bias along previously tagged hotspot trails to create
 * legible chains. Some hotspot centers are classified as "paradise" (reef-friendly,
 * lusher), others as "volcanic" (occasional cone peeking above the sea; tougher
 * vegetation nearby). Feature/biome micro-tweaks occur in other layers; this
 * module only handles terrain placement and StoryTag classification.
 *
 * Guardrails:
 * - Preserves open sea lanes by avoiding tiles within a small radius of land.
 * - Keeps clusters tiny (1–3 tiles; 1–2 when hotspot-biased).
 * - Leaves heavy validation to feature layers.
 * - O(width × height) with constant-time local checks.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type {
  IslandsConfig as BootstrapIslandsConfig,
  HotspotTunables as BootstrapHotspotTunables,
  CorridorsConfig as BootstrapCorridorsConfig,
} from "../bootstrap/types.js";
import { ctxRandom, writeHeightfield } from "../core/types.js";
import { getStoryTags } from "../story/tags.js";
import { getTunables } from "../bootstrap/tunables.js";

// ============================================================================
// Types
// ============================================================================

// Re-export canonical types
export type IslandsConfig = BootstrapIslandsConfig;
export type HotspotTunables = BootstrapHotspotTunables;
export type CorridorsConfig = BootstrapCorridorsConfig;

// ============================================================================
// Constants
// ============================================================================

// Fractal indices (from map-globals.js)
const HILL_FRACTAL = 1;

// Terrain type constants - imported from shared module (matched to Civ7 terrain.xml)
import { COAST_TERRAIN, FLAT_TERRAIN, OCEAN_TERRAIN } from "../core/terrain-constants.js";

// ============================================================================
// Helper Functions
// ============================================================================

function storyKey(x: number, y: number): string {
  return `${x},${y}`;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Place small island clusters in deep water, with hotspot bias.
 *
 * @param iWidth - Map width
 * @param iHeight - Map height
 * @param ctx - Optional MapContext for adapter-based operations
 */
export function addIslandChains(
  iWidth: number,
  iHeight: number,
  ctx?: ExtendedMapContext | null
): void {
  const adapter = ctx?.adapter;

  // Create sparse mask fractal
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 5, 0);
  }

  const tunables = getTunables();
  const islandsCfg = (tunables.FOUNDATION_CFG?.islands as IslandsConfig) || {};
  const storyTunables = (tunables.FOUNDATION_CFG?.story as { hotspot?: HotspotTunables }) || {};
  const corridorsCfg = (tunables.FOUNDATION_CFG?.corridors as CorridorsConfig) || {};

  const fracPct = (islandsCfg.fractalThresholdPercent ?? 90) | 0;
  const threshold = getFractalThreshold(adapter, fracPct);

  // Hotspot classification tunables
  const paradiseWeight = (storyTunables.hotspot?.paradiseBias ?? 2) | 0;
  const volcanicWeight = (storyTunables.hotspot?.volcanicBias ?? 1) | 0;
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round((storyTunables.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10)
  );

  const StoryTags = getStoryTags();

  const applyTerrain = (tileX: number, tileY: number, terrain: number, isLand: boolean): void => {
    if (ctx) {
      writeHeightfield(ctx, tileX, tileY, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(tileX, tileY, terrain);
    }
  };

  const getRandom = (label: string, max: number): number => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    if (adapter) {
      return adapter.getRandomNumber(max, label);
    }
    return Math.floor(Math.random() * max);
  };

  const getFractalHeight = (x: number, y: number): number => {
    if (adapter?.getFractalHeight) {
      return adapter.getFractalHeight(HILL_FRACTAL, x, y);
    }
    return 0;
  };

  const isWater = (x: number, y: number): boolean => {
    if (adapter) {
      return adapter.isWater(x, y);
    }
    return true;
  };

  const isAdjacentToLand = (x: number, y: number, radius: number): boolean => {
    if (!adapter) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (!adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };

  for (let y = 2; y < iHeight - 2; y++) {
    for (let x = 2; x < iWidth - 2; x++) {
      if (!isWater(x, y)) continue;

      // Keep islands away from existing land
      const minDist = (islandsCfg.minDistFromLandRadius ?? 2) | 0;
      if (isAdjacentToLand(x, y, Math.max(0, minDist))) continue;

      // Respect strategic sea-lane corridors
      const laneRadius = (corridorsCfg.sea?.avoidRadius ?? 2) | 0;
      if (laneRadius > 0 && StoryTags.corridorSeaLane && StoryTags.corridorSeaLane.size > 0) {
        let nearSeaLane = false;
        for (let my = -laneRadius; my <= laneRadius && !nearSeaLane; my++) {
          for (let mx = -laneRadius; mx <= laneRadius; mx++) {
            const kk = storyKey(x + mx, y + my);
            if (StoryTags.corridorSeaLane.has(kk)) {
              nearSeaLane = true;
              break;
            }
          }
        }
        if (nearSeaLane) continue;
      }

      const v = getFractalHeight(x, y);
      const isHotspot = StoryTags.hotspot.has(storyKey(x, y));

      // Margin context
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

      // Base sparse placement vs. hotspot- and margin-biased placement
      const denActive = (islandsCfg.baseIslandDenNearActive ?? 5) | 0;
      const denElse = (islandsCfg.baseIslandDenElse ?? 7) | 0;
      const baseIslandDen = nearActive ? denActive : denElse;

      const baseAllowed =
        v > threshold && getRandom("Island Seed", baseIslandDen) === 0;
      const hotspotAllowed =
        isHotspot &&
        getRandom("Hotspot Island Seed", Math.max(1, (islandsCfg.hotspotSeedDenom ?? 2) | 0)) === 0;

      if (!(baseAllowed || hotspotAllowed)) continue;

      // Default to coast water; occasionally let a volcanic center "peek" as land
      let centerTerrain = COAST_TERRAIN;
      let classifyParadise = false;

      if (isHotspot) {
        const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
        const vWeight = volcanicWeight;
        const bucket = pWeight + vWeight;
        const roll = getRandom("HotspotKind", bucket || 1);
        classifyParadise = roll < pWeight;

        if (!classifyParadise) {
          // Volcanic: rare cone peeking above sea level
          if (getRandom("HotspotPeak", 100) < peakPercent) {
            centerTerrain = FLAT_TERRAIN;
          }
        }
      }

      // Place center tile
      const centerIsLand =
        centerTerrain !== COAST_TERRAIN && centerTerrain !== OCEAN_TERRAIN;
      applyTerrain(x, y, centerTerrain, centerIsLand);

      // Classify center for downstream microclimates/features
      if (isHotspot) {
        if (classifyParadise) {
          StoryTags.hotspotParadise.add(storyKey(x, y));
        } else {
          StoryTags.hotspotVolcanic.add(storyKey(x, y));
        }
      }

      // Create a tiny cluster around the center
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

/**
 * Get fractal height threshold from percentage.
 */
function getFractalThreshold(
  adapter: EngineAdapter | undefined,
  percent: number
): number {
  // Without adapter, use a simple approximation
  // The engine's FractalBuilder.getHeightFromPercent returns a value based on the fractal distribution
  // We approximate this as a linear scale for the fallback
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return Math.floor((clampedPercent / 100) * 65535);
}

export default addIslandChains;
