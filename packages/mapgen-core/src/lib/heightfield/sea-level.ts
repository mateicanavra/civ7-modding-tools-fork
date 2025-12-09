/**
 * Compute a sea level value that yields the target land tile count.
 *
 * The heights array is treated as a continuous scalar field; we pick the
 * quantile corresponding to the desired land coverage. Caller decides whether
 * to use `>` or `>=` for land checks.
 */
export function computeSeaLevel(
  heights: Float32Array | number[],
  targetLandTiles: number
): number {
  const size = heights.length;
  if (size === 0) return 0;

  const clampedTarget = Math.max(0, Math.min(size, Math.floor(targetLandTiles)));
  if (clampedTarget === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (clampedTarget >= size) {
    return Number.NEGATIVE_INFINITY;
  }

  const sorted = Array.from(heights).sort((a, b) => a - b);
  // We want the cutoff such that `targetLandTiles` values are above it.
  const cutoffIndex = size - clampedTarget;
  const seaLevel = sorted[Math.max(0, Math.min(size - 1, cutoffIndex))];
  return Number.isFinite(seaLevel) ? seaLevel : 0;
}
