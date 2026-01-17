import { clampInt, idx } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

export function computeWinds(
  width: number,
  height: number,
  latitudeByRow: Float32Array,
  options: { seed: number; jetStreaks: number; jetStrength: number; variance: number }
): { windU: Int8Array; windV: Int8Array } {
  const size = Math.max(0, width * height);
  const windU = new Int8Array(size);
  const windV = new Int8Array(size);

  const streaks = options.jetStreaks | 0;
  const jetStrength = options.jetStrength;
  const variance = options.variance;

  const rng = createLabelRng(options.seed | 0);
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
