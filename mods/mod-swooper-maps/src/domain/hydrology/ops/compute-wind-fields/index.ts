import { clampInt, idx } from "@swooper/mapgen-core";
import { createOp } from "@swooper/mapgen-core/authoring";
import type { LabelRng } from "@swooper/mapgen-core/lib/rng";

import ComputeWindFieldsContract from "./contract.js";
import type { ComputeWindFieldsConfig } from "./contract.js";

function requireRng(rng: LabelRng | undefined, scope: string): LabelRng {
  if (!rng) {
    throw new Error(`[Hydrology] RNG not provided for ${scope}.`);
  }
  return rng;
}

function requireLatitudeByRow(value: unknown, height: number): Float32Array {
  if (!(value instanceof Float32Array) || value.length !== height) {
    throw new Error("[Hydrology] Invalid latitudeByRow for hydrology/compute-wind-fields.");
  }
  return value;
}

function requireWaterMask(value: unknown, width: number, height: number): Uint8Array {
  const size = Math.max(0, (width | 0) * (height | 0));
  if (!(value instanceof Uint8Array) || value.length !== size) {
    throw new Error("[Hydrology] Invalid isWaterMask for hydrology/compute-wind-fields.");
  }
  return value;
}

function computeWinds(
  width: number,
  height: number,
  config: ComputeWindFieldsConfig,
  latitudeByRow: Float32Array,
  rng: LabelRng
): { windU: Int8Array; windV: Int8Array } {
  const size = width * height;
  const windU = new Int8Array(size);
  const windV = new Int8Array(size);

  const streaks = config.windJetStreaks | 0;
  const jetStrength = config.windJetStrength;
  const variance = config.windVariance;

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

const computeWindFields = createOp(ComputeWindFieldsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const rng = requireRng(
          input.rng as unknown as LabelRng | undefined,
          "hydrology/compute-wind-fields"
        );
        const latitudeByRow = requireLatitudeByRow(input.latitudeByRow, height);
        const isWaterMask = requireWaterMask(input.isWaterMask, width, height);

        const { windU, windV } = computeWinds(
          width,
          height,
          config as unknown as ComputeWindFieldsConfig,
          latitudeByRow,
          rng
        );
        const { currentU, currentV } = computeCurrents(width, height, latitudeByRow, isWaterMask);

        return {
          wind: Object.freeze({ windU, windV, currentU, currentV }),
        } as const;
      },
    },
  },
});

export default computeWindFields;
