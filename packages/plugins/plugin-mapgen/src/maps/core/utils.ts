// @ts-nocheck
/**
 * Core utilities for the Epic Diverse Huge map generator.
 * These helpers centralize common operations so layers can share consistent logic.
 *
 * Exports:
 *  - clamp(v, min, max)
 *  - inBounds(x, y)
 *  - storyKey(x, y)
 *  - isAdjacentToLand(x, y, radius)
 *  - getFeatureTypeIndex(name)
 */

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} v
 * @param {number} [min=0]
 * @param {number} [max=200]
 * @returns {number}
 */
export function clamp(v, min = 0, max = 200) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

/**
 * Check if coordinates are within the current map bounds.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function inBounds(x, y) {
  // GameplayMap is provided by the game engine at runtime.
  const width = GameplayMap && typeof GameplayMap.getGridWidth === "function" ? GameplayMap.getGridWidth() : 0;
  const height = GameplayMap && typeof GameplayMap.getGridHeight === "function" ? GameplayMap.getGridHeight() : 0;
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Produce a stable string key for a tile coordinate.
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export function storyKey(x, y) {
  return `${x},${y}`;
}

/**
 * Determine whether any tile within a Chebyshev radius of (x, y) is land.
 * Radius of 1 checks 8-neighborhood; larger radii expand the search square.
 * @param {number} x
 * @param {number} y
 * @param {number} [radius=1]
 * @returns {boolean}
 */
export function isAdjacentToLand(x, y, radius = 1) {
  if (radius <= 0) return false;
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!GameplayMap.isWater(nx, ny)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Resolve a feature type index from its ruleset name using engine lookups.
 * Returns -1 if the feature is not found (caller should then skip placement).
 * @param {string} name
 * @returns {number}
 */
export function getFeatureTypeIndex(name) {
  if (!name || !GameInfo || !GameInfo.Features || typeof GameInfo.Features.lookup !== "function") {
    return -1;
  }
  const def = GameInfo.Features.lookup(name);
  if (def && typeof def.$index === "number") {
    return def.$index;
  }
  return -1;
}
