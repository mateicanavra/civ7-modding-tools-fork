/**
 * Core module - Shared utilities and types
 *
 * This module contains utility functions and types used
 * across all other modules.
 */

// Re-export types
export * from "@mapgen/core/types.js";
export * from "@mapgen/core/plot-tags.js";
export * from "@mapgen/core/terrain-constants.js";
export * from "@mapgen/core/assertions.js";

export { idx, xyFromIndex } from "@mapgen/lib/grid/indexing.js";
export { inBounds } from "@mapgen/lib/grid/bounds.js";
export { wrapX } from "@mapgen/lib/grid/wrap.js";

/**
 * Produce a stable string key for a tile coordinate.
 * Used for sparse storage in Sets/Maps.
 */
export function storyKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Parse a story key back into coordinates
 */
export function parseStoryKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export { clamp, clamp01, clampInt, clampPct } from "@mapgen/lib/math/clamp.js";
export { lerp } from "@mapgen/lib/math/lerp.js";

/**
 * Fill a typed array buffer with a value
 */
export function fillBuffer(
  buffer: { fill: (value: number) => void } | null | undefined,
  value: number
): void {
  if (buffer && typeof buffer.fill === "function") {
    buffer.fill(value);
  }
}
