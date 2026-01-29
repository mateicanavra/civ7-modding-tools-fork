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
  routingElevation?: Float32Array;
  flowDir: Int32Array;
  flowAccum: Float32Array;
  erodibility: Float32Array;
  sedimentDepth: Float32Array;
  landMask: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const routingElevation =
    input.routingElevation instanceof Float32Array ? (input.routingElevation as Float32Array) : undefined;
  const flowDir = input.flowDir as Int32Array;
  const flowAccum = input.flowAccum as Float32Array;
  const erodibility = input.erodibilityK as Float32Array;
  const sedimentDepth = input.sedimentDepth as Float32Array;
  const landMask = input.landMask as Uint8Array;

  if (
    elevation.length !== size ||
    (routingElevation != null && routingElevation.length !== size) ||
    flowDir.length !== size ||
    flowAccum.length !== size ||
    erodibility.length !== size ||
    sedimentDepth.length !== size ||
    landMask.length !== size
  ) {
    throw new Error("[Geomorphology] Input tensors must match width*height.");
  }

  return { size, elevation, routingElevation, flowDir, flowAccum, erodibility, sedimentDepth, landMask };
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
  routingElevation?: Float32Array;
  flowDir: Int32Array;
  flowAccum: Float32Array;
  erodibility: Float32Array;
  sedimentDepth: Float32Array;
  landMask: Uint8Array;
  config: ComputeGeomorphicCycleTypes["config"]["default"];
}): { elevationDelta: Float32Array; sedimentDelta: Float32Array } {
  const { width, height, elevation, routingElevation, flowDir, flowAccum, erodibility, sedimentDepth, landMask, config } =
    params;
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

  const scratchElevation = new Float32Array(size);
  const scratchSediment = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    scratchElevation[i] = elevation[i] ?? 0;
    scratchSediment[i] = sedimentDepth[i] ?? 0;
  }

  const slopeSurface = routingElevation ?? scratchElevation;

  const erosionRate = fluvial.rate * ageScale;
  const diffusionRate = diffusion.rate * ageScale;
  const depositionRate = deposition.rate * ageScale;

  const m = fluvial.m;
  const n = fluvial.n;

  for (let era = 0; era < eras; era++) {
    let maxDrop = 1;
    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;
      const dest = flowDir[i] ?? -1;
      if (dest < 0 || dest >= size) continue;
      const drop = (slopeSurface[i] ?? 0) - (slopeSurface[dest] ?? 0);
      if (drop > maxDrop) maxDrop = drop;
    }

    const elevationDeltaEra = new Float32Array(size);
    const sedimentDeltaEra = new Float32Array(size);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const elev = scratchElevation[i] ?? 0;

        const isLand = landMask[i] === 1;

        let diffusionDelta = 0;
        if (isLand && diffusionRate > 0) {
          let neighborSum = elev;
          let neighborCount = 1;
          forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
            const ni = ny * width + nx;
            neighborSum += scratchElevation[ni] ?? 0;
            neighborCount++;
          });
          const avg = neighborSum / neighborCount;
          diffusionDelta = (avg - elev) * diffusionRate;
        }

        const dest = flowDir[i] ?? -1;
        const aNorm = clamp((flowAccum[i] ?? 0) / maxFlow, 0, 1);
        const discharge = Math.pow(aNorm, m);
        const slopeElev = slopeSurface[i] ?? elev;
        const drop =
          dest >= 0 && dest < size ? Math.max(0, slopeElev - (slopeSurface[dest] ?? 0)) : 0;
        const slopeNorm = clamp(drop / maxDrop, 0, 1);
        const slope = Math.pow(slopeNorm, n);
        const streamPower = clamp(discharge * slope, 0, 1);

        const erosion = isLand ? erosionRate * (erodibility[i] ?? 0) * streamPower : 0;
        const baseSediment = Math.max(0, (scratchSediment[i] ?? 0) + erosion);

        const settles = baseSediment * depositionRate * (1 - streamPower);
        const transports =
          dest >= 0 && dest < size ? baseSediment * depositionRate * streamPower : 0;

        elevationDeltaEra[i] += diffusionDelta - erosion + settles;
        sedimentDeltaEra[i] += erosion - settles - transports;
        if (dest >= 0 && dest < size) {
          sedimentDeltaEra[dest] += transports;
        }
      }
    }

    for (let i = 0; i < size; i++) {
      const dE = elevationDeltaEra[i] ?? 0;
      const dS = sedimentDeltaEra[i] ?? 0;
      elevationDelta[i] += dE;
      sedimentDelta[i] += dS;
      scratchElevation[i] += dE;
      scratchSediment[i] = Math.max(0, scratchSediment[i] + dS);
    }
  }

  return { elevationDelta, sedimentDelta };
}
