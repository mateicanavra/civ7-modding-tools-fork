export { clamp01 } from "@swooper/mapgen-core";

export function computeMaxLatitude(latitude: Float32Array): number {
  let max = 0;
  for (let i = 0; i < latitude.length; i++) {
    const val = Math.abs(latitude[i]);
    if (val > max) max = val;
  }
  return Math.max(1, max);
}
