import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import type { ComputeFlowRoutingTypes } from "../types.js";

/**
 * Ensures flow-routing inputs match the expected map size.
 */
export function validateFlowRoutingInputs(
  input: ComputeFlowRoutingTypes["input"]
): { size: number; elevation: Int16Array; landMask: Uint8Array } {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const landMask = input.landMask as Uint8Array;
  if (elevation.length !== size || landMask.length !== size) {
    throw new Error("[FlowRouting] Input tensors must match width*height.");
  }
  return { size, elevation, landMask };
}

/**
 * Selects the steepest-descent neighbor for a tile.
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

/**
 * Computes flow accumulation with a high-to-low elevation pass.
 */
export function computeFlowAccumulation(
  elevation: Int16Array,
  landMask: Uint8Array,
  flowDir: Int32Array
): Float32Array {
  const size = elevation.length;
  const indices: number[] = [];
  for (let i = 0; i < size; i++) {
    if (landMask[i] === 1) indices.push(i);
  }
  indices.sort((a, b) => elevation[b] - elevation[a]);

  const flowAccum = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    flowAccum[i] = landMask[i] === 1 ? 1 : 0;
  }
  for (const i of indices) {
    const dest = flowDir[i];
    if (dest >= 0 && landMask[dest] === 1) {
      flowAccum[dest] += flowAccum[i];
    }
  }
  return flowAccum;
}
