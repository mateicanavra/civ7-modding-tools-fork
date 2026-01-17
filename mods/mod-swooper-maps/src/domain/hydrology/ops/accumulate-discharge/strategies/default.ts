import { createStrategy } from "@swooper/mapgen-core/authoring";
import AccumulateDischargeContract from "../contract.js";
import { clamp01, clampMin } from "../rules/index.js";

export const defaultStrategy = createStrategy(AccumulateDischargeContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/accumulate-discharge.");
    }
    if (!(input.flowDir instanceof Int32Array) || input.flowDir.length !== size) {
      throw new Error("[Hydrology] Invalid flowDir for hydrology/accumulate-discharge.");
    }
    if (!(input.rainfall instanceof Uint8Array) || input.rainfall.length !== size) {
      throw new Error("[Hydrology] Invalid rainfall for hydrology/accumulate-discharge.");
    }
    if (!(input.humidity instanceof Uint8Array) || input.humidity.length !== size) {
      throw new Error("[Hydrology] Invalid humidity for hydrology/accumulate-discharge.");
    }

    const runoff = new Float32Array(size);
    const discharge = new Float32Array(size);
    const sinkMask = new Uint8Array(size);
    const outletMask = new Uint8Array(size);

    const runoffScale = config.runoffScale;
    const infiltrationFraction = clamp01(config.infiltrationFraction);
    const humidityDampening = clamp01(config.humidityDampening);
    const minRunoff = Math.max(0, config.minRunoff);

    const receiver = new Int32Array(size);
    for (let i = 0; i < size; i++) receiver[i] = -1;

    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) {
        runoff[i] = 0;
        discharge[i] = 0;
        sinkMask[i] = 0;
        outletMask[i] = 0;
        continue;
      }

      const rain = input.rainfall[i] ?? 0;
      const humid = (input.humidity[i] ?? 0) / 255;

      const source =
        clampMin(rain * runoffScale, minRunoff) *
        (1 - infiltrationFraction) *
        (1 - humidityDampening * clamp01(humid));

      runoff[i] = source;
      discharge[i] = source;

      const raw = input.flowDir[i] ?? -1;
      if (raw < 0 || raw >= size) {
        sinkMask[i] = raw < 0 ? 1 : 0;
        outletMask[i] = 0;
        receiver[i] = -1;
        continue;
      }

      if (input.landMask[raw] !== 1) {
        sinkMask[i] = 0;
        outletMask[i] = 1;
        receiver[i] = -1;
        continue;
      }

      sinkMask[i] = 0;
      outletMask[i] = 0;
      receiver[i] = raw;
    }

    const indegree = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      const r = receiver[i];
      if (r >= 0) indegree[r] = (indegree[r] ?? 0) + 1;
    }

    const queue = new Int32Array(size);
    let head = 0;
    let tail = 0;

    let landCount = 0;
    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) continue;
      landCount++;
      if (indegree[i] === 0) queue[tail++] = i;
    }

    let processed = 0;
    while (head < tail) {
      const i = queue[head++]!;
      processed++;
      const r = receiver[i]!;
      if (r < 0) continue;

      discharge[r] = (discharge[r] ?? 0) + (discharge[i] ?? 0);
      indegree[r] = (indegree[r] ?? 0) - 1;
      if (indegree[r] === 0) queue[tail++] = r;
    }

    if (processed < landCount) {
      // Deterministic fallback for any residual cycles: do not route further.
      for (let i = 0; i < size; i++) {
        if (input.landMask[i] === 1 && indegree[i] > 0) receiver[i] = -1;
      }
    }

    return { runoff, discharge, sinkMask, outletMask } as const;
  },
});
