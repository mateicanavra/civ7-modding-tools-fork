/**
 * Story Orogeny — Mountain belt tagging and windward/lee cache.
 *
 * Ports legacy story/orogeny logic into a MapContext-friendly implementation:
 * - Uses FoundationContext tensors when available
 * - Falls back to a conservative elevation-density heuristic otherwise
 * - Publishes an immutable overlay snapshot for Task Graph contracts
 *
 * Uses lazy provider pattern for test isolation.
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "../../../core/types.js";
import { inBounds, storyKey } from "../../../core/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "../overlays/index.js";
import { getDims } from "../utils/dims.js";
import { isWaterAt } from "../utils/water.js";

import { getOrogenyCache } from "./cache.js";
import { zonalWindStep } from "./wind.js";

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
export function storyTagOrogenyBelts(ctx: ExtendedMapContext | null = null): StoryOverlaySnapshot {
  const cache = getOrogenyCache();
  cache.belts.clear();
  cache.windward.clear();
  cache.lee.clear();

  const { width, height } = getDims(ctx);
  const area = Math.max(1, width * height);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  const storyCfg = (ctx?.config?.story || {}) as Record<string, unknown>;
  const cfg = (storyCfg.orogeny || {}) as Record<string, number>;

  const baseRadius = Number.isFinite(cfg.radius) ? (cfg.radius | 0) : 2;
  const radius = baseRadius + (sqrtScale > 1.5 ? 1 : 0);
  const beltMinLength = Number.isFinite(cfg.beltMinLength) ? (cfg.beltMinLength | 0) : 30;
  const minLenSoft = Math.max(10, Math.round(beltMinLength * (0.9 + 0.4 * sqrtScale)));

  let kind: OrogenySummary["kind"] = "legacy";

  if (ctx?.foundation?.plates && ctx?.foundation?.dynamics) {
    kind = "foundation";

    const U = ctx.foundation.plates.upliftPotential;
    const S = ctx.foundation.plates.tectonicStress;
    const BT = ctx.foundation.plates.boundaryType;
    const BC = ctx.foundation.plates.boundaryCloseness;

    let thr = 180;
    let attempts = 0;
    while (attempts++ < 5) {
      cache.belts.clear();
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (isWaterAt(ctx, x, y)) continue;
          const i = y * width + x;
          if (BT[i] !== 1 || BC[i] < 48) continue;
          const metric = Math.round(0.7 * U[i] + 0.3 * S[i]);
          if (metric < thr) continue;

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
          if (dense >= 2) cache.belts.add(storyKey(x, y));
        }
      }
      if (cache.belts.size >= minLenSoft || thr <= 128) break;
      thr -= 12;
    }

    const windU = ctx.foundation.dynamics.windU;
    const windV = ctx.foundation.dynamics.windV;
    const windStepXY = (x: number, y: number): { dx: number; dy: number } => {
      try {
        const i = y * width + x;
        const u = windU[i] | 0;
        const v = windV[i] | 0;
        if (Math.abs(u) >= Math.abs(v)) return { dx: u === 0 ? 0 : u > 0 ? 1 : -1, dy: 0 };
        return { dx: 0, dy: v === 0 ? 0 : v > 0 ? 1 : -1 };
      } catch {
        return zonalWindStep(ctx, x, y);
      }
    };

    if (cache.belts.size >= minLenSoft) {
      for (const key of cache.belts) {
        const [sx, sy] = key.split(",").map(Number);
        const { dx, dy } = windStepXY(sx, sy);
        const upwindX = -dx;
        const upwindY = -dy;
        const downX = dx;
        const downY = dy;
        for (let r = 1; r <= radius; r++) {
          const wx = sx + upwindX * r;
          const wy = sy + upwindY * r;
          const lx = sx + downX * r;
          const ly = sy + downY * r;
          if (inBounds(wx, wy, width, height) && !isWaterAt(ctx, wx, wy)) cache.windward.add(storyKey(wx, wy));
          if (inBounds(lx, ly, width, height) && !isWaterAt(ctx, lx, ly)) cache.lee.add(storyKey(lx, ly));
        }
      }
    } else {
      cache.belts.clear();
    }
  } else {
    const isHighElev = (x: number, y: number): boolean => {
      if (!inBounds(x, y, width, height)) return false;
      try {
        if (ctx?.adapter?.isMountain?.(x, y)) return true;
      } catch {
        // ignore
      }
      const elev = ctx?.adapter?.getElevation?.(x, y) ?? GameplayMap?.getElevation?.(x, y) ?? 0;
      return elev >= 500;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isHighElev(x, y)) continue;
        let hi = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isHighElev(x + dx, y + dy)) hi++;
          }
        }
        if (hi >= 2) cache.belts.add(storyKey(x, y));
      }
    }

    if (cache.belts.size >= minLenSoft) {
      for (const key of cache.belts) {
        const [x, y] = key.split(",").map(Number);
        const { dx, dy } = zonalWindStep(ctx, x, y);
        const upwindX = -dx;
        const upwindY = -dy;
        const downX = dx;
        const downY = dy;
        for (let r = 1; r <= radius; r++) {
          const wx = x + upwindX * r;
          const wy = y + upwindY * r;
          const lx = x + downX * r;
          const ly = y + downY * r;
          if (inBounds(wx, wy, width, height) && !isWaterAt(ctx, wx, wy)) cache.windward.add(storyKey(wx, wy));
          if (inBounds(lx, ly, width, height) && !isWaterAt(ctx, lx, ly)) cache.lee.add(storyKey(lx, ly));
        }
      }
    } else {
      cache.belts.clear();
    }
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
