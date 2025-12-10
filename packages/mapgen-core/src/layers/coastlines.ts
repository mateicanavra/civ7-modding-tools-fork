/**
 * Coastlines Layer — addRuggedCoasts
 *
 * Light-touch coastal reshaping that carves occasional bays and creates sparse
 * fjord-like peninsulas while preserving open sea lanes. Uses a low-frequency
 * fractal mask and conservative randomness to avoid chokepoint proliferation.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type {
  CoastlinesConfig as BootstrapCoastlinesConfig,
  CoastlinePlateBiasConfig as BootstrapCoastlinePlateBiasConfig,
  CoastlineBayConfig as BootstrapCoastlineBayConfig,
  CoastlineFjordConfig as BootstrapCoastlineFjordConfig,
  SeaCorridorPolicy as BootstrapSeaCorridorPolicy,
  CorridorsConfig,
} from "../bootstrap/types.js";
import { ctxRandom, writeHeightfield } from "../core/types.js";
import { BOUNDARY_TYPE } from "../world/constants.js";
import { getStoryTags } from "../story/tags.js";
import { getTunables } from "../bootstrap/tunables.js";

// ============================================================================
// Types
// ============================================================================

// Re-export canonical types
export type CoastlinePlateBiasConfig = BootstrapCoastlinePlateBiasConfig;
export type CoastlineBayConfig = BootstrapCoastlineBayConfig;
export type CoastlineFjordConfig = BootstrapCoastlineFjordConfig;
export type SeaCorridorPolicy = BootstrapSeaCorridorPolicy;
export type CoastlinesConfig = BootstrapCoastlinesConfig;

/** Corridor policy configuration (uses canonical CorridorsConfig) */
export type CorridorPolicy = CorridorsConfig;

// ============================================================================
// Constants
// ============================================================================

// Fractal indices (from map-globals.js)
const HILL_FRACTAL = 1;

// Terrain type constants - imported from shared module (matched to Civ7 terrain.xml)
import { COAST_TERRAIN } from "../core/terrain-constants.js";

// ============================================================================
// Helper Functions
// ============================================================================

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function computePlateBias(
  closenessNorm: number | null | undefined,
  boundaryType: number,
  cfg: Required<CoastlinePlateBiasConfig>
): number {
  let cn = closenessNorm;
  if (cn == null || Number.isNaN(cn)) cn = 0;

  const threshold = cfg.threshold;
  const power = cfg.power;
  let weight = 0;

  if (cn >= threshold) {
    const span = Math.max(1e-3, 1 - threshold);
    const normalized = clamp((cn - threshold) / span, 0, 1);
    const ramp = Math.pow(normalized, power);

    let typeMul = 0;
    if (boundaryType === BOUNDARY_TYPE.convergent) typeMul = cfg.convergent;
    else if (boundaryType === BOUNDARY_TYPE.transform) typeMul = cfg.transform;
    else if (boundaryType === BOUNDARY_TYPE.divergent) typeMul = cfg.divergent;

    weight = ramp * typeMul;
  } else if (cfg.interior !== 0 && threshold > 0) {
    const normalized = clamp(1 - cn / threshold, 0, 1);
    weight = Math.pow(normalized, power) * cfg.interior;
  }

  return weight;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Ruggedize coasts in a sparse, performance-friendly pass.
 * - Occasionally converts coastal land to shallow water (bays).
 * - Occasionally converts adjacent ocean to coast (peninsulas/fjords).
 * - Only operates near current coastlines; does not perform heavy flood fills.
 *
 * @param iWidth - Map width
 * @param iHeight - Map height
 * @param ctx - Optional MapContext for adapter-based operations
 */
export function addRuggedCoasts(
  iWidth: number,
  iHeight: number,
  ctx?: ExtendedMapContext | null
): void {
  const adapter = ctx?.adapter;

  // Size-aware modifiers
  const area = Math.max(1, iWidth * iHeight);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  // Create fractal for noise mask
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 4, 0);
  }

  // Foundation context integration (plate data)
  const foundation = ctx?.foundation;
  const boundaryCloseness = foundation?.plates.boundaryCloseness ?? null;
  const boundaryType = foundation?.plates.boundaryType ?? null;

  // Configuration
  const tunables = getTunables();
  const cfg = (tunables.FOUNDATION_CFG?.coastlines as CoastlinesConfig) || {};
  const cfgBay = cfg.bay || {};
  const cfgFjord = cfg.fjord || {};

  const bayNoiseExtra =
    (sqrtScale > 1 ? 1 : 0) + (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd! : 0);
  const fjordBaseDenom = Math.max(
    6,
    (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom! : 12) - (sqrtScale > 1.3 ? 1 : 0)
  );
  const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus) ? cfgFjord.activeBonus! : 1;
  const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus) ? cfgFjord.passiveBonus! : 2;
  const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive) ? cfgBay.rollDenActive! : 4;
  const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault) ? cfgBay.rollDenDefault! : 5;

  const plateBiasRaw = cfg.plateBias || {};
  const plateBiasCfg: Required<CoastlinePlateBiasConfig> = {
    threshold: clamp(Number.isFinite(plateBiasRaw.threshold) ? plateBiasRaw.threshold! : 0.45, 0, 1),
    power: Math.max(0.1, Number.isFinite(plateBiasRaw.power) ? plateBiasRaw.power! : 1.25),
    convergent: Number.isFinite(plateBiasRaw.convergent) ? plateBiasRaw.convergent! : 1.0,
    transform: Number.isFinite(plateBiasRaw.transform) ? plateBiasRaw.transform! : 0.4,
    divergent: Number.isFinite(plateBiasRaw.divergent) ? plateBiasRaw.divergent! : -0.6,
    interior: Number.isFinite(plateBiasRaw.interior) ? plateBiasRaw.interior! : 0,
    bayWeight: Math.max(0, Number.isFinite(plateBiasRaw.bayWeight) ? plateBiasRaw.bayWeight! : 0.35),
    bayNoiseBonus: Math.max(
      0,
      Number.isFinite(plateBiasRaw.bayNoiseBonus) ? plateBiasRaw.bayNoiseBonus! : 1.0
    ),
    fjordWeight: Math.max(
      0,
      Number.isFinite(plateBiasRaw.fjordWeight) ? plateBiasRaw.fjordWeight! : 0.8
    ),
  };

  // Corridor policy
  const corridorPolicy = (tunables.FOUNDATION_CFG?.corridors as CorridorPolicy) || {};
  const seaPolicy = corridorPolicy.sea || {};
  const SEA_PROTECTION = seaPolicy.protection || "hard";
  const SOFT_MULT = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));

  // Story tags
  const StoryTags = getStoryTags();

  const applyTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };

  const isCoastalLand = (x: number, y: number): boolean => {
    if (!adapter) return false;
    if (adapter.isWater(x, y)) return false;
    // Check adjacent tiles for water
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
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

  for (let y = 1; y < iHeight - 1; y++) {
    for (let x = 1; x < iWidth - 1; x++) {
      // Sea-lane policy check
      const tileKey = `${x},${y}`;
      const onSeaLane = StoryTags.corridorSeaLane?.has(tileKey) ?? false;
      const softMult = onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;

      if (onSeaLane && SEA_PROTECTION === "hard") {
        continue;
      }

      // Carve bays: coastal land -> coast water
      if (isCoastalLand(x, y)) {
        const h = getFractalHeight(x, y);

        // Plate boundary integration
        const i = y * iWidth + x;
        const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
        const closenessNorm = closenessByte / 255;
        const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
        const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
        const plateBiasValue = boundaryCloseness
          ? computePlateBias(closenessNorm, bType, plateBiasCfg)
          : 0;

        // Margin-aware bay carving
        const isActive = StoryTags.activeMargin?.has(tileKey) || nearBoundary;
        const noiseGateBonus =
          plateBiasValue > 0 ? Math.round(plateBiasValue * plateBiasCfg.bayNoiseBonus) : 0;
        const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0) + noiseGateBonus;
        const bayRollDen = isActive ? bayRollDenActive : bayRollDenDefault;
        let bayRollDenUsed =
          softMult !== 1 ? Math.max(1, Math.round(bayRollDen / softMult)) : bayRollDen;

        if (plateBiasCfg.bayWeight > 0 && plateBiasValue !== 0) {
          const scale = clamp(1 + plateBiasValue * plateBiasCfg.bayWeight, 0.25, 4);
          bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / scale));
        }

        // Corridor edge effect
        let laneAttr: Record<string, unknown> | null = null;
        for (let ddy = -1; ddy <= 1 && !laneAttr; ddy++) {
          for (let ddx = -1; ddx <= 1; ddx++) {
            if (ddx === 0 && ddy === 0) continue;
            const k = `${x + ddx},${y + ddy}`;
            if (StoryTags.corridorSeaLane?.has(k)) {
              laneAttr = (StoryTags.corridorAttributes?.get(k) as Record<string, unknown>) || null;
              if (laneAttr) break;
            }
          }
        }

        if (laneAttr?.edge) {
          const edgeCfg = laneAttr.edge as Record<string, unknown>;
          const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier)
            ? (edgeCfg.bayCarveMultiplier as number)
            : 1;
          if (bayMult && bayMult !== 1) {
            bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
          }
        }

        if (h % 97 < noiseGate && getRandom("Carve Bay", bayRollDenUsed) === 0) {
          applyTerrain(x, y, COAST_TERRAIN, false);
          continue;
        }
      }

      // Fjord-like peninsulas: turn some adjacent ocean into coast
      if (adapter?.isWater(x, y)) {
        if (isAdjacentToLand(x, y, 1)) {
          // Plate boundary integration
          const i = y * iWidth + x;
          const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
          const closenessNorm = closenessByte / 255;
          const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
          const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
          const plateBiasValue = boundaryCloseness
            ? computePlateBias(closenessNorm, bType, plateBiasCfg)
            : 0;

          // Margin-aware fjord generation
          let nearActive = nearBoundary;
          let nearPassive = false;

          for (let ddy = -1; ddy <= 1 && (!nearActive || !nearPassive); ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
              const k = `${nx},${ny}`;
              if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
              if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
            }
          }

          const denom = Math.max(
            4,
            fjordBaseDenom - (nearPassive ? fjordPassiveBonus : 0) - (nearActive ? fjordActiveBonus : 0)
          );
          let denomUsed = softMult !== 1 ? Math.max(1, Math.round(denom / softMult)) : denom;

          if (plateBiasCfg.fjordWeight > 0 && plateBiasValue !== 0) {
            const fjScale = clamp(1 + plateBiasValue * plateBiasCfg.fjordWeight, 0.2, 5);
            denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
          }

          // Corridor edge effect
          let edgeCfg: Record<string, unknown> | null = null;
          for (let my = -1; my <= 1 && !edgeCfg; my++) {
            for (let mx = -1; mx <= 1; mx++) {
              if (mx === 0 && my === 0) continue;
              const kk = `${x + mx},${y + my}`;
              if (StoryTags.corridorSeaLane?.has(kk)) {
                const attr = StoryTags.corridorAttributes?.get(kk) as Record<string, unknown> | undefined;
                edgeCfg = attr?.edge ? (attr.edge as Record<string, unknown>) : null;
                if (edgeCfg) break;
              }
            }
          }

          if (edgeCfg) {
            const fj = Number.isFinite(edgeCfg.fjordChance) ? (edgeCfg.fjordChance as number) : 0;
            const cliffs = Number.isFinite(edgeCfg.cliffsChance)
              ? (edgeCfg.cliffsChance as number)
              : 0;
            const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
            if (effect > 0) {
              denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
            }
          }

          if (getRandom("Fjord Coast", denomUsed) === 0) {
            applyTerrain(x, y, COAST_TERRAIN, false);
          }
        }
      }
    }
  }
}

export default addRuggedCoasts;
