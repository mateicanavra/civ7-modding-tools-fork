import { createStrategy } from "@swooper/mapgen-core/authoring";
import ApplyAlbedoFeedbackContract from "../contract.js";
import { clamp01, clampNumber, lerp01 } from "../rules/index.js";

export const defaultStrategy = createStrategy(ApplyAlbedoFeedbackContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/apply-albedo-feedback.");
    }
    if (!(input.rainfall instanceof Uint8Array) || input.rainfall.length !== size) {
      throw new Error("[Hydrology] Invalid rainfall for hydrology/apply-albedo-feedback.");
    }
    if (
      !(input.surfaceTemperatureC instanceof Float32Array) ||
      input.surfaceTemperatureC.length !== size
    ) {
      throw new Error("[Hydrology] Invalid surfaceTemperatureC for hydrology/apply-albedo-feedback.");
    }

    const iterations = config.iterations | 0;
    const snowCoolingC = config.snowCoolingC;
    const seaIceCoolingC = config.seaIceCoolingC;
    const minC = config.minC;
    const maxC = config.maxC;
    const precipitationInfluence = config.precipitationInfluence;

    const landSnowStartC = config.landSnowStartC;
    const landSnowFullC = config.landSnowFullC;
    const seaIceStartC = config.seaIceStartC;
    const seaIceFullC = config.seaIceFullC;

    let temp = new Float32Array(input.surfaceTemperatureC);
    const next = new Float32Array(size);

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < size; i++) {
        const base = temp[i] ?? 0;
        const rain = (input.rainfall[i] ?? 0) / 200;
        const isLand = input.landMask[i] === 1;

        const snowFrac = isLand
          ? lerp01(base, landSnowStartC, landSnowFullC) * (1 + precipitationInfluence * clamp01(rain))
          : 0;
        const seaIceFrac = isLand ? 0 : lerp01(base, seaIceStartC, seaIceFullC);

        const cooling = clamp01(snowFrac) * snowCoolingC + clamp01(seaIceFrac) * seaIceCoolingC;
        next[i] = clampNumber(base - cooling, minC, maxC);
      }
      const swap = temp;
      temp = next;
      for (let i = 0; i < size; i++) next[i] = swap[i] ?? 0;
    }

    return { surfaceTemperatureC: temp } as const;
  },
});
