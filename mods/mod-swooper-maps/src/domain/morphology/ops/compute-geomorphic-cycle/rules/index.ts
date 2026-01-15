import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeGeomorphicCycleTypes } from "../types.js";

const WORLD_AGE_SCALE: Record<string, number> = {
  young: 0.7,
  mature: 1.0,
  old: 1.3,
};

/**
 * Ensures geomorphic-cycle inputs match the expected map size.
 */
export function validateGeomorphicInputs(
  input: ComputeGeomorphicCycleTypes["input"]
): {
  size: number;
  elevation: Int16Array;
  flowAccum: Float32Array;
  erodibility: Float32Array;
  sedimentDepth: Float32Array;
  landMask: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const flowAccum = input.flowAccum as Float32Array;
  const erodibility = input.erodibilityK as Float32Array;
  const sedimentDepth = input.sedimentDepth as Float32Array;
  const landMask = input.landMask as Uint8Array;

  if (
    elevation.length !== size ||
    flowAccum.length !== size ||
    erodibility.length !== size ||
    sedimentDepth.length !== size ||
    landMask.length !== size
  ) {
    throw new Error("[Geomorphology] Input tensors must match width*height.");
  }

  return { size, elevation, flowAccum, erodibility, sedimentDepth, landMask };
}

/**
 * Resolves the world-age scaling multiplier.
 */
export function resolveWorldAgeScale(worldAge: ComputeGeomorphicCycleTypes["config"]["default"]["worldAge"]): number {
  return WORLD_AGE_SCALE[worldAge] ?? 1.0;
}

/**
 * Computes geomorphic elevation + sediment deltas for the configured eras.
 */
export function computeGeomorphicDeltas(params: {
  width: number;
  height: number;
  elevation: Int16Array;
  flowAccum: Float32Array;
  erodibility: Float32Array;
  sedimentDepth: Float32Array;
  landMask: Uint8Array;
  config: ComputeGeomorphicCycleTypes["config"]["default"];
}): { elevationDelta: Float32Array; sedimentDelta: Float32Array } {
  const { width, height, elevation, flowAccum, erodibility, sedimentDepth, landMask, config } = params;
  const size = elevation.length;

  let maxFlow = 1;
  for (let i = 0; i < size; i++) {
    if (flowAccum[i] > maxFlow) maxFlow = flowAccum[i];
  }

  const ageScale = resolveWorldAgeScale(config.worldAge);
  const fluvial = config.geomorphology.fluvial;
  const diffusion = config.geomorphology.diffusion;
  const deposition = config.geomorphology.deposition;
  const eras = config.geomorphology.eras;

  const elevationDelta = new Float32Array(size);
  const sedimentDelta = new Float32Array(size);

  for (let era = 0; era < eras; era++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (landMask[i] === 0) continue;
        const elev = elevation[i];
        let neighborSum = elev;
        let neighborCount = 1;
        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          const ni = ny * width + nx;
          neighborSum += elevation[ni];
          neighborCount++;
        });

        const avg = neighborSum / neighborCount;
        const diffusionDelta = (avg - elev) * diffusion.rate;
        const flowNorm = clamp(flowAccum[i] / maxFlow, 0, 1);
        const erosion = flowNorm * fluvial.rate * erodibility[i];
        const deposit = (1 - flowNorm) * deposition.rate * sedimentDepth[i];

        elevationDelta[i] += (diffusionDelta - erosion + deposit) * ageScale;
        sedimentDelta[i] += (deposit - erosion * 0.5) * ageScale;
      }
    }
  }

  return { elevationDelta, sedimentDelta };
}
