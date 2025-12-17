/**
 * MountainBeltStrategy — Mountain belt detection and wind-side tagging
 *
 * Purpose:
 * - Identify mountain belts (contiguous high-relief zones along plate boundaries)
 * - Tag windward (upwind) and lee (downwind/rain shadow) sides of belts
 * - Provide data for orographic rainfall effects in climate refinement
 *
 * Algorithm:
 * 1. Use foundation plate tensors if available (convergent boundaries, uplift)
 * 2. Fall back to elevation-density heuristic if no foundation data
 * 3. Compute zonal wind direction based on latitude (Hadley cells)
 * 4. Tag tiles upwind as windward (orographic lift → more rain)
 * 5. Tag tiles downwind as lee (rain shadow → less rain)
 *
 * Invariants:
 * - Only tags land tiles (not water)
 * - Respects minimum belt length configuration
 * - Uses deterministic plate/elevation data
 * - O(width × height) for detection, O(belts × radius) for wind tagging
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "../../../core/types.js";
import { inBounds, storyKey } from "../../../core/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "../../narrative/overlays/index.js";
import { getMountainCache } from "./cache.js";

// ============================================================================
// Types
// ============================================================================

export interface MountainBeltConfig {
  /** Search radius for windward/lee tagging */
  radius: number;
  /** Minimum contiguous belt length to qualify */
  beltMinLength: number;
}

export interface MountainBeltSummary {
  belts: number;
  windward: number;
  lee: number;
  kind: "foundation" | "legacy";
  [key: string]: unknown;
}

// ============================================================================
// Wind Direction Utilities
// ============================================================================

/**
 * Compute zonal wind step based on latitude (simplified Hadley cell model).
 *
 * - Equator to 30°: Trade winds blow westward (dx = -1)
 * - 30° to 60°: Westerlies blow eastward (dx = +1)
 * - 60° to poles: Polar easterlies blow westward (dx = -1)
 */
export function computeZonalWindStep(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number
): { dx: number; dy: number } {
  try {
    const lat = Math.abs(
      ctx?.adapter?.getLatitude?.(x, y) ??
        (typeof GameplayMap !== "undefined" ? GameplayMap?.getPlotLatitude?.(x, y) : 0) ??
        0
    );
    // Trade winds (0-30°) and polar easterlies (60°+) blow west; westerlies (30-60°) blow east
    return { dx: lat < 30 || lat >= 60 ? -1 : 1, dy: 0 };
  } catch {
    return { dx: 1, dy: 0 };
  }
}

/**
 * Get wind direction from foundation dynamics if available.
 */
function getFoundationWindStep(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  width: number
): { dx: number; dy: number } | null {
  try {
    const dynamics = ctx.foundation?.dynamics;
    if (!dynamics?.windU || !dynamics?.windV) return null;

    const i = y * width + x;
    const u = dynamics.windU[i] | 0;
    const v = dynamics.windV[i] | 0;

    if (Math.abs(u) >= Math.abs(v)) {
      return { dx: u === 0 ? 0 : u > 0 ? 1 : -1, dy: 0 };
    }
    return { dx: 0, dy: v === 0 ? 0 : v > 0 ? 1 : -1 };
  } catch {
    return null;
  }
}

// ============================================================================
// Belt Detection (Foundation-based)
// ============================================================================

function detectBeltsFromFoundation(
  ctx: ExtendedMapContext,
  width: number,
  height: number,
  minLength: number
): Set<string> {
  const belts = new Set<string>();
  const plates = ctx.foundation!.plates;

  const U = plates.upliftPotential;
  const S = plates.tectonicStress;
  const BT = plates.boundaryType;
  const BC = plates.boundaryCloseness;

  // Adaptive threshold to get enough belt tiles
  let thr = 180;
  let attempts = 0;

  while (attempts++ < 5) {
    belts.clear();

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (ctx.adapter.isWater(x, y)) continue;

        const i = y * width + x;

        // Must be on convergent boundary (type 1) with sufficient closeness
        if (BT[i] !== 1 || BC[i] < 48) continue;

        // Combined uplift/stress metric
        const metric = Math.round(0.7 * U[i] + 0.3 * S[i]);
        if (metric < thr) continue;

        // Density check: require neighbors also above threshold
        let dense = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const j = (y + dy) * width + (x + dx);
            if (j < 0 || j >= width * height) continue;
            const m2 = Math.round(0.7 * U[j] + 0.3 * S[j]);
            if (m2 >= thr) dense++;
          }
        }

        if (dense >= 2) {
          belts.add(storyKey(x, y));
        }
      }
    }

    if (belts.size >= minLength || thr <= 128) break;
    thr -= 12;
  }

  return belts.size >= minLength ? belts : new Set();
}

// ============================================================================
// Belt Detection (Legacy/Fallback)
// ============================================================================

function detectBeltsFromElevation(
  ctx: ExtendedMapContext,
  width: number,
  height: number,
  minLength: number
): Set<string> {
  const belts = new Set<string>();

  const isHighElev = (x: number, y: number): boolean => {
    if (!inBounds(x, y, width, height)) return false;

    try {
      if (ctx.adapter.isMountain?.(x, y)) return true;
    } catch {
      // ignore
    }

    const elev =
      ctx.adapter.getElevation?.(x, y) ??
      (typeof GameplayMap !== "undefined" ? GameplayMap?.getElevation?.(x, y) : 0) ??
      0;

    return elev >= 500;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isHighElev(x, y)) continue;

      // Density check: require high elevation neighbors
      let hi = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (isHighElev(x + dx, y + dy)) hi++;
        }
      }

      if (hi >= 2) {
        belts.add(storyKey(x, y));
      }
    }
  }

  return belts.size >= minLength ? belts : new Set();
}

// ============================================================================
// Windward/Lee Tagging
// ============================================================================

function tagWindwardLee(
  ctx: ExtendedMapContext,
  belts: Set<string>,
  windward: Set<string>,
  lee: Set<string>,
  width: number,
  height: number,
  radius: number,
  useFoundationWind: boolean
): void {
  for (const key of belts) {
    const [sx, sy] = key.split(",").map(Number);

    // Get wind direction
    let wind: { dx: number; dy: number };
    if (useFoundationWind) {
      wind = getFoundationWindStep(ctx, sx, sy, width) ?? computeZonalWindStep(ctx, sx, sy);
    } else {
      wind = computeZonalWindStep(ctx, sx, sy);
    }

    const upwindX = -wind.dx;
    const upwindY = -wind.dy;
    const downX = wind.dx;
    const downY = wind.dy;

    // Tag tiles in upwind direction as windward
    // Tag tiles in downwind direction as lee
    for (let r = 1; r <= radius; r++) {
      const wx = sx + upwindX * r;
      const wy = sy + upwindY * r;
      const lx = sx + downX * r;
      const ly = sy + downY * r;

      if (inBounds(wx, wy, width, height) && !ctx.adapter.isWater(wx, wy)) {
        windward.add(storyKey(wx, wy));
      }
      if (inBounds(lx, ly, width, height) && !ctx.adapter.isWater(lx, ly)) {
        lee.add(storyKey(lx, ly));
      }
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect mountain belts and tag windward/lee sides for climate effects.
 *
 * This is the main entry point for mountain belt detection. It:
 * 1. Uses foundation plate data if available (preferred)
 * 2. Falls back to elevation-based detection otherwise
 * 3. Tags windward and lee sides based on wind direction
 * 4. Stores results in the unified mountain cache
 *
 * @returns Summary of detected belts and tagged tiles
 */
export function detectMountainBelts(
  ctx: ExtendedMapContext | null = null
): StoryOverlaySnapshot {
  const cache = getMountainCache(ctx);
  cache.belts.clear();
  cache.windward.clear();
  cache.lee.clear();

  if (!ctx) {
    return publishEmptyOverlay(ctx, "legacy");
  }

  const { width, height } = ctx.dimensions;
  const area = Math.max(1, width * height);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  // Get configuration
  const storyCfg = (ctx.config?.story || {}) as Record<string, unknown>;
  const cfg = (storyCfg.orogeny || {}) as Record<string, number>;

  const baseRadius = Number.isFinite(cfg.radius) ? (cfg.radius | 0) : 2;
  const radius = baseRadius + (sqrtScale > 1.5 ? 1 : 0);
  const beltMinLength = Number.isFinite(cfg.beltMinLength) ? (cfg.beltMinLength | 0) : 30;
  const minLenSoft = Math.max(10, Math.round(beltMinLength * (0.9 + 0.4 * sqrtScale)));

  let kind: MountainBeltSummary["kind"] = "legacy";
  let detectedBelts: Set<string>;

  // Detect belts using foundation data if available
  const hasFoundation =
    ctx.foundation?.plates &&
    ctx.foundation?.dynamics &&
    ctx.foundation.plates.upliftPotential &&
    ctx.foundation.plates.boundaryType &&
    ctx.foundation.plates.boundaryCloseness;

  if (hasFoundation) {
    kind = "foundation";
    detectedBelts = detectBeltsFromFoundation(ctx, width, height, minLenSoft);
  } else {
    detectedBelts = detectBeltsFromElevation(ctx, width, height, minLenSoft);
  }

  // Copy to cache
  for (const key of detectedBelts) {
    cache.belts.add(key);
  }

  // Tag windward and lee sides
  if (cache.belts.size >= minLenSoft) {
    tagWindwardLee(
      ctx,
      cache.belts,
      cache.windward,
      cache.lee,
      width,
      height,
      radius,
      kind === "foundation"
    );
  } else {
    // Clear if not enough belts
    cache.belts.clear();
  }

  console.log(
    `[MountainBelt] Detected ${cache.belts.size} belt tiles, ` +
      `${cache.windward.size} windward, ${cache.lee.size} lee (${kind})`
  );

  return publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.OROGENY, {
    kind: STORY_OVERLAY_KEYS.OROGENY,
    version: 1,
    width,
    height,
    active: Array.from(cache.belts),
    passive: Array.from(cache.windward),
    summary: {
      belts: cache.belts.size,
      windward: cache.windward.size,
      lee: cache.lee.size,
      kind,
    } as MountainBeltSummary,
  });
}

function publishEmptyOverlay(
  ctx: ExtendedMapContext | null,
  kind: MountainBeltSummary["kind"]
): StoryOverlaySnapshot {
  return {
    key: STORY_OVERLAY_KEYS.OROGENY,
    kind: STORY_OVERLAY_KEYS.OROGENY,
    version: 1,
    width: ctx?.dimensions?.width ?? 0,
    height: ctx?.dimensions?.height ?? 0,
    active: [],
    passive: [],
    summary: {
      belts: 0,
      windward: 0,
      lee: 0,
      kind,
    } as MountainBeltSummary,
  };
}

// Re-export for backward compatibility
export { computeZonalWindStep as zonalWindStep };

export default detectMountainBelts;
