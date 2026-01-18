import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeRadiativeForcingContract from "../contract.js";
import { computeInsolationByLatitude } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeRadiativeForcingContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);
    const latitudeByRow = input.latitudeByRow;
    if (!(latitudeByRow instanceof Float32Array) || latitudeByRow.length !== height) {
      throw new Error("[Hydrology] Invalid latitudeByRow for hydrology/compute-radiative-forcing.");
    }

    const insolation = new Float32Array(size);
    const equator = config.equatorInsolation;
    const pole = config.poleInsolation;
    const exponent = config.latitudeExponent;

    for (let y = 0; y < height; y++) {
      const lat = Math.abs(latitudeByRow[y] ?? 0);
      const value = computeInsolationByLatitude(lat, { equator, pole, exponent });
      const row = y * width;
      for (let x = 0; x < width; x++) {
        insolation[row + x] = value;
      }
    }

    return { insolation } as const;
  },
});
