import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeOceanSurfaceCurrentsContract from "../contract.js";
import { computeCurrents } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeOceanSurfaceCurrentsContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    const latitudeByRow = input.latitudeByRow;
    if (!(latitudeByRow instanceof Float32Array) || latitudeByRow.length !== height) {
      throw new Error(
        "[Hydrology] Invalid latitudeByRow for hydrology/compute-ocean-surface-currents."
      );
    }
    if (!(input.isWaterMask instanceof Uint8Array) || input.isWaterMask.length !== size) {
      throw new Error("[Hydrology] Invalid isWaterMask for hydrology/compute-ocean-surface-currents.");
    }
    if (!(input.windU instanceof Int8Array) || input.windU.length !== size) {
      throw new Error("[Hydrology] Invalid windU for hydrology/compute-ocean-surface-currents.");
    }
    if (!(input.windV instanceof Int8Array) || input.windV.length !== size) {
      throw new Error("[Hydrology] Invalid windV for hydrology/compute-ocean-surface-currents.");
    }

    return computeCurrents(width, height, latitudeByRow, input.isWaterMask, config.strength);
  },
});
