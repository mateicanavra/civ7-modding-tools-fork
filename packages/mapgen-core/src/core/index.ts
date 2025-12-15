/**
 * Core module - Shared utilities and types
 *
 * This module contains utility functions and types used
 * across all other modules.
 */

// Re-export types
export * from "./types.js";
export * from "./plot-tags.js";
export * from "./terrain-constants.js";

export { idx, xyFromIndex } from "../lib/grid/indexing.js";
export { inBounds } from "../lib/grid/bounds.js";
export { wrapX } from "../lib/grid/wrap.js";

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

export { clamp, clamp01, clampInt, clampPct } from "../lib/math/clamp.js";
export { lerp } from "../lib/math/lerp.js";

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
