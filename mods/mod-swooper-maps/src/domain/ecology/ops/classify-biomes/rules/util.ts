export { clamp01 } from "@swooper/mapgen-core";

/**
 * Computes the maximum absolute latitude (degrees) used to normalize climate curves.
 *
 * We clamp to at least 90 degrees so map-level "latitude zoom" does not
 * accidentally treat the map edges as polar latitudes.
 */
export function computeMaxLatitude(latitude: Float32Array): number {
  let max = 0;
  for (let i = 0; i < latitude.length; i++) {
    const val = Math.abs(latitude[i]);
    if (val > max) max = val;
  }
  return Math.max(90, max, 1);
}
