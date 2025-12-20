
/**
 * Story Orogeny — Mountain belt tagging and windward/lee cache.
 *
 * Ports legacy story/orogeny logic into a MapContext-friendly implementation:
 * - Uses FoundationContext tensors
 * - Publishes an immutable overlay snapshot for Task Graph contracts
 *
 * Uses lazy provider pattern for test isolation.
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "@mapgen/core/types.js";
import { inBounds, storyKey } from "@mapgen/core/index.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import { getDims } from "@mapgen/domain/narrative/utils/dims.js";
import { isWaterAt } from "@mapgen/domain/narrative/utils/water.js";

import { getOrogenyCache, type OrogenyCacheInstance } from "@mapgen/domain/narrative/orogeny/cache.js";

export interface OrogenySummary {
  belts: number;
  windward: number;
  lee: number;
  kind: "foundation" | "legacy";
}

/**
 * Tag orogeny belts and populate an in-memory OrogenyCache for climate swatches.
 * Always publishes a `storyOverlays` snapshot (even if empty) for Task Graph contracts.
 */
export function storyTagOrogenyBelts(ctx: ExtendedMapContext): StoryOverlaySnapshot {
  assertFoundationContext(ctx, "storyOrogeny");
  const cache = getOrogenyCache(ctx);
  cache.belts.clear();
  cache.windward.clear();
  cache.lee.clear();

  const { width, height } = getDims(ctx);
  const area = Math.max(1, width * height);
  
  // Dynamic scaling based on map size
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
  
  // Configuration
  const storyCfg = (ctx?.config?.story || {}) as Record<string, unknown>;
  const cfg = (storyCfg.orogeny || {}) as Record<string, number>;

  const baseRadius = Number.isFinite(cfg.radius) ? (cfg.radius | 0) : 2;
  const radius = baseRadius + (sqrtScale > 1.5 ? 1 : 0);
  const beltMinLength = Number.isFinite(cfg.beltMinLength) ? (cfg.beltMinLength | 0) : 30;
  const minLenSoft = Math.max(10, Math.round(beltMinLength * (0.9 + 0.4 * sqrtScale)));

  const kind: OrogenySummary["kind"] = "foundation";
  runFoundationPass(ctx, cache, width, height, minLenSoft);

  // Common Windward/Lee Tagging
  if (cache.belts.size >= minLenSoft) {
    const { windU, windV } = ctx.foundation.dynamics;
    tagWindwardLee(ctx, cache, width, height, radius, windU, windV);
  } else {
    // If belts are too small/fragmented, discard them to avoid noise
    cache.belts.clear();
  }

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
    },
  });
}

// ============================================================================
// Strategies
// ============================================================================

/**
 * Identifies mountain belts using Plate Tectonics data (Uplift + Stress).
 * Iteratively relaxes the threshold until enough belts are found or limit reached.
 */
function runFoundationPass(
  ctx: ExtendedMapContext,
  cache: OrogenyCacheInstance,
  width: number,
  height: number,
  minLenSoft: number
): void {
  assertFoundationContext(ctx, "storyOrogeny");
  const { upliftPotential: U, tectonicStress: S, boundaryType: BT, boundaryCloseness: BC } = ctx.foundation.plates;
  
  let thr = 180;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts++ < maxAttempts) {
    cache.belts.clear();

    // Inner loop: 1-pixel margin to avoid boundary checks
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (isWaterAt(ctx, x, y)) continue;

        const i = y * width + x;
        
        // Filter: Must be Convergent Boundary (1) and reasonably close
        if (BT[i] !== 1 || BC[i] < 48) continue;

        // Metric: Weighted blend of Uplift and Stress
        const metric = Math.round(0.7 * U[i] + 0.3 * S[i]);
        if (metric < thr) continue;

        // Density Check: Must have at least 2 neighbors exceeding threshold
        let dense = 0;
        // 3x3 neighborhood check
        neighbor_loop: for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const j = (y + dy) * width + (x + dx);
            const m2 = Math.round(0.7 * U[j] + 0.3 * S[j]);
            
            if (m2 >= thr) {
              dense++;
              if (dense >= 2) break neighbor_loop; // Optimization: Fail fast
            }
          }
        }

        if (dense >= 2) {
          cache.belts.add(storyKey(x, y));
        }
      }
    }

    // Exit condition: Found enough belts or threshold is too low
    if (cache.belts.size >= minLenSoft || thr <= 128) break;
    thr -= 12;
  }
}

/**
 * Casts "Windward" (wet) and "Lee" (dry) shadows from identified belts.
 */
function tagWindwardLee(
  ctx: ExtendedMapContext,
  cache: OrogenyCacheInstance,
  width: number,
  height: number,
  radius: number,
  windU: Int8Array,
  windV: Int8Array
): void {
  for (const key of cache.belts) {
    const [sx, sy] = key.split(",").map(Number);
    
    // Determine prevailing wind direction at this location
    const { dx, dy } = getWindStep(sx, sy, width, windU, windV);
    
    const upwindX = -dx;
    const upwindY = -dy;
    const downX = dx;
    const downY = dy;

    for (let r = 1; r <= radius; r++) {
      // Windward (Upwind side)
      const wx = sx + upwindX * r;
      const wy = sy + upwindY * r;
      if (inBounds(wx, wy, width, height) && !isWaterAt(ctx, wx, wy)) {
        cache.windward.add(storyKey(wx, wy));
      }

      // Lee (Downwind side)
      const lx = sx + downX * r;
      const ly = sy + downY * r;
      if (inBounds(lx, ly, width, height) && !isWaterAt(ctx, lx, ly)) {
        cache.lee.add(storyKey(lx, ly));
      }
    }
  }
}

/**
 * Helper to determine wind direction vector (dx, dy).
 * Prioritizes Foundation dynamics, falls back to Zonal approximation.
 */
function getWindStep(
  x: number,
  y: number,
  width: number,
  windU: Int8Array,
  windV: Int8Array
): { dx: number; dy: number } {
  const i = y * width + x;
  if (i >= 0 && i < windU.length) {
    const u = windU[i];
    const v = windV[i];
    if (Math.abs(u) >= Math.abs(v)) {
      return { dx: u === 0 ? 0 : u > 0 ? 1 : -1, dy: 0 };
    }
    return { dx: 0, dy: v === 0 ? 0 : v > 0 ? 1 : -1 };
  }
  return { dx: 0, dy: 0 };
}
