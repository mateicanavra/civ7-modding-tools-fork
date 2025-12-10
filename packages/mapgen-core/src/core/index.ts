/**
 * Core module - Shared utilities and types
 *
 * This module contains utility functions and types used
 * across all other modules.
 */

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
