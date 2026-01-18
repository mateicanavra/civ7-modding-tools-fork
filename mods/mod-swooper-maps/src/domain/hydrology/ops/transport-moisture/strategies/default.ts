import { createStrategy } from "@swooper/mapgen-core/authoring";
import TransportMoistureContract from "../contract.js";
import { clamp01, upwindIndex, upwindOffset } from "../rules/index.js";

export const defaultStrategy = createStrategy(TransportMoistureContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    const latitudeByRow = input.latitudeByRow;
    if (!(latitudeByRow instanceof Float32Array) || latitudeByRow.length !== height) {
      throw new Error("[Hydrology] Invalid latitudeByRow for hydrology/transport-moisture.");
    }
    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/transport-moisture.");
    }
    if (!(input.windU instanceof Int8Array) || input.windU.length !== size) {
      throw new Error("[Hydrology] Invalid windU for hydrology/transport-moisture.");
    }
    if (!(input.windV instanceof Int8Array) || input.windV.length !== size) {
      throw new Error("[Hydrology] Invalid windV for hydrology/transport-moisture.");
    }
    if (!(input.evaporation instanceof Float32Array) || input.evaporation.length !== size) {
      throw new Error("[Hydrology] Invalid evaporation for hydrology/transport-moisture.");
    }

    const iterations = config.iterations | 0;
    const advection = config.advection;
    const retention = config.retention;

    let prev = new Float32Array(size);
    let next = new Float32Array(size);
    for (let i = 0; i < size; i++) prev[i] = clamp01(input.evaporation[i] ?? 0);

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < height; y++) {
        const absLat = Math.abs(latitudeByRow[y] ?? 0);
        const row = y * width;
        for (let x = 0; x < width; x++) {
          const i = row + x;
          const dxdy = upwindOffset(input.windU[i] | 0, input.windV[i] | 0, absLat);
          const up = upwindIndex(x, y, width, height, dxdy.dx, dxdy.dy);
          const local = input.evaporation[i] ?? 0;
          const advected = prev[up] ?? 0;
          next[i] = clamp01((local + advected * advection) * retention);
        }
      }
      const swap = prev;
      prev = next;
      next = swap;
    }

    return { humidity: prev } as const;
  },
});
