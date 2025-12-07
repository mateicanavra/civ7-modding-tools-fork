/**
 * Core module - Shared utilities and types
 *
 * This module contains utility functions and types used
 * across all other modules.
 */

// Re-export types
export * from "./types.js";
export * from "./plot-tags.js";

// ============================================================================
// Coordinate Utilities
// ============================================================================

/**
 * Calculate linear index from (x, y) coordinates
 */
export function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

/**
 * Check if coordinates are within bounds
 */
export function inBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

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

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Wrap x coordinate for cylindrical maps
 */
export function wrapX(x: number, width: number): number {
  return ((x % width) + width) % width;
}

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
