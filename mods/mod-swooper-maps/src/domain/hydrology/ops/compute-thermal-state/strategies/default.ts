import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeThermalStateContract from "../contract.js";
import { clampNumber } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeThermalStateContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.insolation instanceof Float32Array) || input.insolation.length !== size) {
      throw new Error("[Hydrology] Invalid insolation for hydrology/compute-thermal-state.");
    }
    if (!(input.elevation instanceof Int16Array) || input.elevation.length !== size) {
      throw new Error("[Hydrology] Invalid elevation for hydrology/compute-thermal-state.");
    }
    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/compute-thermal-state.");
    }

    const surfaceTemperatureC = new Float32Array(size);
    const base = config.baseTemperatureC;
    const insolationScale = config.insolationScaleC;
    const lapseRate = config.lapseRateCPerM;
    const landCooling = config.landCoolingC;
    const minC = config.minC;
    const maxC = config.maxC;

    for (let i = 0; i < size; i++) {
      const forcing = (input.insolation[i] ?? 0) - 0.5;
      const elevation = input.elevation[i] | 0;
      const isLand = input.landMask[i] === 1;
      const temp =
        base +
        forcing * insolationScale +
        elevation * lapseRate -
        (isLand ? landCooling : 0);
      surfaceTemperatureC[i] = clampNumber(temp, minC, maxC);
    }

    return { surfaceTemperatureC } as const;
  },
});
