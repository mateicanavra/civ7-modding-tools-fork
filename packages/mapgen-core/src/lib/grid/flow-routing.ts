import { forEachHexNeighborOddQ } from "@mapgen/lib/grid/neighborhood/hex-oddq.js";

/**
 * Select the steepest-descent neighbor index for a tile in odd-q hex space.
 */
export function selectFlowReceiver(
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: Int16Array
): number {
  const i = y * width + x;
  let bestIdx = -1;
  let bestElev = elevation[i] ?? 0;
  forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
    const ni = ny * width + nx;
    const elev = elevation[ni] ?? bestElev;
    if (elev < bestElev) {
      bestElev = elev;
      bestIdx = ni;
    }
  });
  return bestIdx;
}
