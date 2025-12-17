/**
 * Mountain Cache — Unified storage for mountain belt and pass data
 *
 * This module provides a centralized cache for all mountain-related
 * computed data that needs to be shared across generation stages:
 *
 * - belts: Set of mountain belt tiles (high relief, plate boundaries)
 * - windward: Set of tiles on the upwind side of belts (more rainfall)
 * - lee: Set of tiles on the downwind side (rain shadow)
 * - passes: Set of tiles identified as mountain passes
 *
 * The cache is stored in the MapContext artifacts map for cross-stage access.
 */

import type { ExtendedMapContext } from "../../../core/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Unified mountain cache instance containing all mountain-related tags.
 */
export interface MountainCacheInstance {
  /** Mountain belt tiles (ridgelines, high relief areas) */
  belts: Set<string>;
  /** Windward (upwind) side of mountain belts - receives orographic rainfall */
  windward: Set<string>;
  /** Lee (downwind) side of mountain belts - rain shadow zones */
  lee: Set<string>;
  /** Mountain pass tiles - traversable routes through ranges */
  passes: Set<string>;
}

/**
 * Orogeny cache interface for backward compatibility with hydrology layer.
 * @deprecated Use MountainCacheInstance directly
 */
export interface OrogenyCache {
  windward?: Set<string>;
  lee?: Set<string>;
}

// ============================================================================
// Cache Management
// ============================================================================

const MOUNTAIN_CACHE_ARTIFACT_KEY = "morphology:mountainCache";

function createCache(): MountainCacheInstance {
  return {
    belts: new Set(),
    windward: new Set(),
    lee: new Set(),
    passes: new Set(),
  };
}

/**
 * Get or create the mountain cache from the context.
 */
export function getMountainCache(
  ctx: ExtendedMapContext | null | undefined
): MountainCacheInstance {
  if (!ctx) return createCache();

  const existing = ctx.artifacts?.get(MOUNTAIN_CACHE_ARTIFACT_KEY) as
    | MountainCacheInstance
    | undefined;

  if (existing) return existing;

  const created = createCache();
  ctx.artifacts?.set(MOUNTAIN_CACHE_ARTIFACT_KEY, created);
  return created;
}

/**
 * Reset the mountain cache to empty state.
 */
export function resetMountainCache(
  ctx: ExtendedMapContext | null | undefined
): void {
  if (!ctx) return;
  ctx.artifacts?.set(MOUNTAIN_CACHE_ARTIFACT_KEY, createCache());
}

/**
 * Clear all sets in the mountain cache without replacing the instance.
 */
export function clearMountainCache(
  ctx: ExtendedMapContext | null | undefined
): void {
  const cache = getMountainCache(ctx);
  cache.belts.clear();
  cache.windward.clear();
  cache.lee.clear();
  cache.passes.clear();
}

/**
 * Get orogeny-compatible cache view for hydrology layer.
 * This provides backward compatibility with existing climate refinement code.
 */
export function getOrogenyCompatCache(
  ctx: ExtendedMapContext | null | undefined
): OrogenyCache {
  const cache = getMountainCache(ctx);
  return {
    windward: cache.windward,
    lee: cache.lee,
  };
}
