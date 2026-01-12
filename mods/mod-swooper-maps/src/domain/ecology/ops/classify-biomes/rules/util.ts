export { clamp01 } from "@swooper/mapgen-core";

/**
 * Computes the maximum absolute latitude, clamped to at least 1 to avoid divide-by-zero.
 */
export function computeMaxLatitude(latitude: Float32Array): number {
  let max = 0;
  for (let i = 0; i < latitude.length; i++) {
    const val = Math.abs(latitude[i]);
    if (val > max) max = val;
  }
  return Math.max(1, max);
}
