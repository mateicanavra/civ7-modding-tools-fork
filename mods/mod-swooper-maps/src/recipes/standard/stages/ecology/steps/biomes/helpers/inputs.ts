import type { ExtendedMapContext } from "@swooper/mapgen-core";

/**
 * Builds a latitude field by sampling the adapter at each tile.
 */
export function buildLatitudeField(
  adapter: ExtendedMapContext["adapter"],
  width: number,
  height: number
): Float32Array {
  const latitude = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      latitude[rowOffset + x] = adapter.getLatitude(x, y);
    }
  }
  return latitude;
}
