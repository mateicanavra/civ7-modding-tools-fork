import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import ComputeBaseTopographyContract from "../contract.js";
import {
  blendBoundaryElevation,
  computeElevationRaw,
  quantizeElevation,
  validateBaseTopographyInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeBaseTopographyContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { size, uplift, rift, closeness } = validateBaseTopographyInputs(input);

    const rng = createLabelRng(input.rngSeed | 0);
    const noiseAmplitude = config.crustNoiseAmplitude;
    const edgeBlend = config.crustEdgeBlend;
    const arcNoiseWeight = config.tectonics.boundaryArcNoiseWeight;
    const fractalGrain = Math.max(1, Math.round(config.tectonics.fractalGrain));

    const elevationRaw = new Float32Array(size);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const upliftNorm = (uplift[i] ?? 0) / 255;
        const riftNorm = (rift[i] ?? 0) / 255;
        const closenessNorm = (closeness[i] ?? 0) / 255;
        const gx = (x / fractalGrain) | 0;
        const gy = (y / fractalGrain) | 0;
        const noise = (rng(1000, `base-topography:${gx},${gy}`) / 1000 - 0.5) * noiseAmplitude;
        const arcNoise = (rng(1000, `boundary-arc:${gx},${gy}`) / 1000 - 0.5) * arcNoiseWeight;
        elevationRaw[i] = computeElevationRaw({
          upliftNorm,
          riftNorm,
          closenessNorm,
          noise,
          arcNoise,
          config,
        });
      }
    }

    const elevation = new Int16Array(size);
    if (edgeBlend > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          let sum = elevationRaw[i];
          let count = 1;
          forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
            const ni = ny * width + nx;
            sum += elevationRaw[ni];
            count++;
          });
          const avg = sum / count;
          const closenessNorm = (closeness[i] ?? 0) / 255;
          const blended = blendBoundaryElevation({
            base: elevationRaw[i],
            neighborAverage: avg,
            closenessNorm,
            edgeBlend,
          });
          elevation[i] = quantizeElevation(blended);
        }
      }
    } else {
      for (let i = 0; i < size; i++) {
        elevation[i] = quantizeElevation(elevationRaw[i]);
      }
    }

    return { elevation };
  },
});
