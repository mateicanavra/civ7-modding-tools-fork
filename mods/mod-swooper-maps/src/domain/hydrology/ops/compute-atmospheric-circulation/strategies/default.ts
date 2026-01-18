import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeAtmosphericCirculationContract from "../contract.js";
import { computeWinds } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeAtmosphericCirculationContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const rngSeed = input.rngSeed | 0;
    const latitudeByRow = input.latitudeByRow;
    if (!(latitudeByRow instanceof Float32Array) || latitudeByRow.length !== height) {
      throw new Error(
        "[Hydrology] Invalid latitudeByRow for hydrology/compute-atmospheric-circulation."
      );
    }

    return computeWinds(width, height, latitudeByRow, {
      seed: rngSeed,
      jetStreaks: config.windJetStreaks,
      jetStrength: config.windJetStrength,
      variance: config.windVariance,
    });
  },
});
