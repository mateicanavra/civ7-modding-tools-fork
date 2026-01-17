import { clampInt, idx } from "@swooper/mapgen-core";

export function computeCurrents(
  width: number,
  height: number,
  latitudeByRow: Float32Array,
  isWaterMask: Uint8Array,
  strength: number
): { currentU: Int8Array; currentV: Int8Array } {
  const size = Math.max(0, width * height);
  const currentU = new Int8Array(size);
  const currentV = new Int8Array(size);
  const scaledStrength = Math.max(0, strength);

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

    const u = clampInt(Math.round(baseU * scaledStrength), -127, 127);
    const v = clampInt(Math.round(baseV * scaledStrength), -127, 127);

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (isWaterMask[i] === 1) {
        currentU[i] = u;
        currentV[i] = v;
      } else {
        currentU[i] = 0;
        currentV[i] = 0;
      }
    }
  }

  return { currentU, currentV };
}
