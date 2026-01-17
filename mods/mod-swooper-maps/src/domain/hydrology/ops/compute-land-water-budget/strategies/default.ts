import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeLandWaterBudgetContract from "../contract.js";
import { clamp01, lerp01 } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeLandWaterBudgetContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/compute-land-water-budget.");
    }
    if (!(input.rainfall instanceof Uint8Array) || input.rainfall.length !== size) {
      throw new Error("[Hydrology] Invalid rainfall for hydrology/compute-land-water-budget.");
    }
    if (!(input.humidity instanceof Uint8Array) || input.humidity.length !== size) {
      throw new Error("[Hydrology] Invalid humidity for hydrology/compute-land-water-budget.");
    }
    if (
      !(input.surfaceTemperatureC instanceof Float32Array) ||
      input.surfaceTemperatureC.length !== size
    ) {
      throw new Error("[Hydrology] Invalid surfaceTemperatureC for hydrology/compute-land-water-budget.");
    }

    const pet = new Float32Array(size);
    const aridityIndex = new Float32Array(size);

    const tMin = config.tMinC;
    const tMax = Math.max(tMin + 1e-6, config.tMaxC);
    const petBase = config.petBase;
    const petTempWeight = config.petTemperatureWeight;
    const humidityDampening = config.humidityDampening;

    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) {
        pet[i] = 0;
        aridityIndex[i] = 0;
        continue;
      }

      const temp = input.surfaceTemperatureC[i] ?? tMin;
      const humidity = (input.humidity[i] ?? 0) / 255;
      const precip = input.rainfall[i] ?? 0;

      const tempFactor = lerp01(temp, tMin, tMax);
      const damp = 1 - humidityDampening * clamp01(humidity);
      const petValue = (petBase + petTempWeight * tempFactor) * clamp01(damp);
      pet[i] = petValue;

      const denom = petValue + precip + 1;
      aridityIndex[i] = denom <= 0 ? 0 : clamp01(petValue / denom);
    }

    return { pet, aridityIndex } as const;
  },
});
