import { createOp } from "@swooper/mapgen-core/authoring";
import { clampInt, idx } from "@swooper/mapgen-core";

import type { RngFunction } from "../../types.js";
import ComputeDynamicsTensorsContract from "./contract.js";
import type { ComputeDynamicsTensorsConfig } from "./contract.js";

function requireRng(rng: RngFunction | undefined, scope: string): RngFunction {
  if (!rng) {
    throw new Error(`[Foundation] RNG not provided for ${scope}.`);
  }
  return rng;
}

function computePressure(
  width: number,
  height: number,
  config: ComputeDynamicsTensorsConfig,
  rng: RngFunction
): Uint8Array {
  const size = width * height;
  const pressure = new Uint8Array(size);

  const mantleCfg = config.dynamics?.mantle;
  if (!mantleCfg) {
    throw new Error("[Foundation] Missing mantle dynamics config.");
  }
  const bumps = (mantleCfg.bumps! | 0);
  const amp = mantleCfg.amplitude!;
  const scl = mantleCfg.scale!;
  const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));

  const centers: Array<{ x: number; y: number; a: number }> = [];
  for (let i = 0; i < bumps; i++) {
    const cx = rng(width, "PressCX");
    const cy = rng(height, "PressCY");
    const a = amp * (0.75 + rng(50, "PressA") / 100);
    centers.push({ x: Math.floor(cx), y: Math.floor(cy), a });
  }

  const acc = new Float32Array(size);
  const inv2s2 = 1.0 / (2 * sigma * sigma);
  let maxVal = 1e-6;

  for (let k = 0; k < centers.length; k++) {
    const { x: cx, y: cy, a } = centers[k];
    const yMin = Math.max(0, cy - sigma * 2);
    const yMax = Math.min(height - 1, cy + sigma * 2);
    const xMin = Math.max(0, cx - sigma * 2);
    const xMax = Math.min(width - 1, cx + sigma * 2);

    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        const e = Math.exp(-(dx * dx + dy * dy) * inv2s2);
        const v = a * e;
        const i = idx(x, y, width);
        acc[i] += v;
        if (acc[i] > maxVal) maxVal = acc[i];
      }
    }
  }

  for (let i = 0; i < size; i++) {
    const value = acc[i] / maxVal;
    const clamped = Math.max(0, Math.min(1, value));
    pressure[i] = Math.round(clamped * 255) | 0;
  }

  return pressure;
}

function computeWinds(
  width: number,
  height: number,
  config: ComputeDynamicsTensorsConfig,
  latitudeByRow: Float32Array,
  rng: RngFunction
): { windU: Int8Array; windV: Int8Array } {
  const size = width * height;
  const windU = new Int8Array(size);
  const windV = new Int8Array(size);

  const windCfg = config.dynamics?.wind;
  if (!windCfg) {
    throw new Error("[Foundation] Missing wind dynamics config.");
  }
  const streaks = (windCfg.jetStreaks! | 0);
  const jetStrength = windCfg.jetStrength!;
  const variance = windCfg.variance!;

  const streakLats: number[] = [];
  for (let s = 0; s < streaks; s++) {
    const base = 30 + s * (30 / Math.max(1, streaks - 1));
    const jitter = rng(12, "JetJit") - 6;
    streakLats.push(Math.max(15, Math.min(75, base + jitter)));
  }

  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(latitudeByRow[y] ?? 0);

    let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
    const v = 0;

    for (let k = 0; k < streakLats.length; k++) {
      const d = Math.abs(latDeg - streakLats[k]);
      const f = Math.max(0, 1 - d / 12);
      if (f > 0) {
        const boost = Math.round(32 * jetStrength * f);
        u += latDeg < streakLats[k] ? boost : -boost;
      }
    }

    const varU = Math.round((rng(21, "WindUVar") - 10) * variance) | 0;
    const varV = Math.round((rng(11, "WindVVar") - 5) * variance) | 0;

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      windU[i] = clampInt(u + varU, -127, 127);
      windV[i] = clampInt(v + varV, -127, 127);
    }
  }

  return { windU, windV };
}

function computeCurrents(
  width: number,
  height: number,
  latitudeByRow: Float32Array,
  isWaterMask: Uint8Array
): { currentU: Int8Array; currentV: Int8Array } {
  const size = width * height;
  const currentU = new Int8Array(size);
  const currentV = new Int8Array(size);

  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(latitudeByRow[y] ?? 0);

    let baseU = 0;
    const baseV = 0;

    if (latDeg < 12) {
      baseU = -50;
    } else if (latDeg >= 45 && latDeg < 60) {
      baseU = 20;
    } else if (latDeg >= 60) {
      baseU = -15;
    }

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (isWaterMask[i]) {
        currentU[i] = clampInt(baseU, -127, 127);
        currentV[i] = clampInt(baseV, -127, 127);
      } else {
        currentU[i] = 0;
        currentV[i] = 0;
      }
    }
  }

  return { currentU, currentV };
}

const computeDynamicsTensors = createOp(ComputeDynamicsTensorsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const rng = requireRng(
          input.rng as unknown as RngFunction | undefined,
          "foundation/compute-dynamics-tensors"
        );
        const latitudeByRow = input.latitudeByRow as unknown as Float32Array;
        const isWaterMask = input.isWaterMask as unknown as Uint8Array;

        const pressure = computePressure(width, height, config as unknown as ComputeDynamicsTensorsConfig, rng);
        const { windU, windV } = computeWinds(width, height, config as unknown as ComputeDynamicsTensorsConfig, latitudeByRow, rng);
        const { currentU, currentV } = computeCurrents(width, height, latitudeByRow, isWaterMask);

        return {
          dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
        } as const;
      },
    },
  },
});

export default computeDynamicsTensors;
