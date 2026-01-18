import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeEvaporationSourcesContract from "../contract.js";
import { clamp01 } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeEvaporationSourcesContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/compute-evaporation-sources.");
    }
    if (
      !(input.surfaceTemperatureC instanceof Float32Array) ||
      input.surfaceTemperatureC.length !== size
    ) {
      throw new Error("[Hydrology] Invalid surfaceTemperatureC for hydrology/compute-evaporation-sources.");
    }

    const evaporation = new Float32Array(size);
    const minT = config.minTempC;
    const maxT = Math.max(minT + 1e-6, config.maxTempC);
    const oceanStrength = config.oceanStrength;
    const landStrength = config.landStrength;

    for (let i = 0; i < size; i++) {
      const temp = input.surfaceTemperatureC[i] ?? minT;
      const factor = clamp01((temp - minT) / (maxT - minT));
      const isLand = input.landMask[i] === 1;
      evaporation[i] = factor * (isLand ? landStrength : oceanStrength);
    }

    return { evaporation } as const;
  },
});
