import { createStrategy } from "@swooper/mapgen-core/authoring";
import { idx } from "@swooper/mapgen-core/lib/grid";

import ComputeClimateDiagnosticsContract from "../contract.js";
import {
  clamp01,
  computeDistanceToWater,
  upwindBarrierDistance,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeClimateDiagnosticsContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.latitudeByRow instanceof Float32Array) || input.latitudeByRow.length !== height) {
      throw new Error("[Hydrology] Invalid latitudeByRow for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.elevation instanceof Int16Array) || input.elevation.length !== size) {
      throw new Error("[Hydrology] Invalid elevation for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.windU instanceof Int8Array) || input.windU.length !== size) {
      throw new Error("[Hydrology] Invalid windU for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.windV instanceof Int8Array) || input.windV.length !== size) {
      throw new Error("[Hydrology] Invalid windV for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.rainfall instanceof Uint8Array) || input.rainfall.length !== size) {
      throw new Error("[Hydrology] Invalid rainfall for hydrology/compute-climate-diagnostics.");
    }
    if (!(input.humidity instanceof Uint8Array) || input.humidity.length !== size) {
      throw new Error("[Hydrology] Invalid humidity for hydrology/compute-climate-diagnostics.");
    }

    const distToWater = computeDistanceToWater(width, height, input.landMask);
    const rainShadowIndex = new Float32Array(size);
    const continentalityIndex = new Float32Array(size);
    const convergenceIndex = new Float32Array(size);

    const maxDist = Math.max(1, config.continentalityMaxDist | 0);
    const steps = Math.max(1, config.barrierSteps | 0);
    const barrierElevationM = config.barrierElevationM | 0;
    const convNorm = Math.max(1, config.convergenceNormalization);

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        if (input.landMask[i] === 0) {
          rainShadowIndex[i] = 0;
          continentalityIndex[i] = 0;
          convergenceIndex[i] = 0;
          continue;
        }

        const dist = distToWater[i] | 0;
        continentalityIndex[i] = clamp01(dist / maxDist);

        const barrier = upwindBarrierDistance(
          x,
          y,
          width,
          height,
          input.elevation,
          input.landMask,
          input.windU,
          input.windV,
          input.latitudeByRow,
          steps,
          { barrierElevationM }
        );
        const rf = (input.rainfall[i] ?? 0) / 200;
        rainShadowIndex[i] = barrier > 0 ? clamp01((barrier / steps) * (1 - rf)) : 0;

        const uL = input.windU[idx(Math.max(0, x - 1), y, width)] | 0;
        const uR = input.windU[idx(Math.min(width - 1, x + 1), y, width)] | 0;
        const vD = input.windV[idx(x, Math.max(0, y - 1), width)] | 0;
        const vU = input.windV[idx(x, Math.min(height - 1, y + 1), width)] | 0;
        const divergence = (uR - uL) + (vU - vD);
        const convergence = Math.max(0, -divergence);
        convergenceIndex[i] = clamp01(convergence / convNorm);
      }
    }

    return { rainShadowIndex, continentalityIndex, convergenceIndex } as const;
  },
});
