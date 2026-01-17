import { createStrategy } from "@swooper/mapgen-core/authoring";

import ComputeCryosphereStateContract from "../contract.js";
import { clamp01, clampU8, lerp01 } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeCryosphereStateContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/compute-cryosphere-state.");
    }
    if (
      !(input.surfaceTemperatureC instanceof Float32Array) ||
      input.surfaceTemperatureC.length !== size
    ) {
      throw new Error("[Hydrology] Invalid surfaceTemperatureC for hydrology/compute-cryosphere-state.");
    }
    if (!(input.rainfall instanceof Uint8Array) || input.rainfall.length !== size) {
      throw new Error("[Hydrology] Invalid rainfall for hydrology/compute-cryosphere-state.");
    }

    const snowCover = new Uint8Array(size);
    const seaIceCover = new Uint8Array(size);
    const albedo = new Uint8Array(size);
    const freezeIndex = new Float32Array(size);

    const precipitationInfluence = config.precipitationInfluence;
    const baseAlbedo = config.baseAlbedo | 0;
    const snowBoost = config.snowAlbedoBoost | 0;
    const seaIceBoost = config.seaIceAlbedoBoost | 0;

    for (let i = 0; i < size; i++) {
      const temp = input.surfaceTemperatureC[i] ?? 0;
      const rain = (input.rainfall[i] ?? 0) / 200;
      const isLand = input.landMask[i] === 1;

      const freeze = lerp01(temp, config.freezeIndexStartC, config.freezeIndexFullC);
      freezeIndex[i] = freeze;

      if (isLand) {
        const base = lerp01(temp, config.landSnowStartC, config.landSnowFullC);
        const precipBoost = 1 + precipitationInfluence * clamp01(rain);
        snowCover[i] = clampU8(base * 255 * precipBoost);
        seaIceCover[i] = 0;
      } else {
        snowCover[i] = 0;
        const ice = lerp01(temp, config.seaIceStartC, config.seaIceFullC);
        seaIceCover[i] = clampU8(ice * 255);
      }

      const snowF = (snowCover[i] ?? 0) / 255;
      const iceF = (seaIceCover[i] ?? 0) / 255;
      albedo[i] = clampU8(baseAlbedo + snowBoost * snowF + seaIceBoost * iceF);
    }

    return { snowCover, seaIceCover, albedo, freezeIndex } as const;
  },
});
