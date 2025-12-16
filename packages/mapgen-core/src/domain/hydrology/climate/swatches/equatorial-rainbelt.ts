import type { SwatchHelpers, SwatchRuntime, SwatchTypeConfig } from "./types.js";

export function applyEquatorialRainbeltSwatch(
  width: number,
  height: number,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers,
  t: SwatchTypeConfig,
  widthMul: number
): number {
  const { readRainfall, writeRainfall } = runtime;
  const { clamp200, isWater, signedLatitudeAt, isCoastalLand } = helpers;

  const latBandCenter = (): number => (t.latitudeCenterDeg as number) ?? 0;
  const halfWidthDeg = (): number =>
    Math.max(4, Math.round(((t.halfWidthDeg as number) ?? 10) * widthMul));
  const falloff = (value: number, radius: number): number =>
    Math.max(0, 1 - value / Math.max(1, radius));

  let applied = 0;

  for (let y = 0; y < height; y++) {
    const latDegAbs = Math.abs(signedLatitudeAt(y));

    for (let x = 0; x < width; x++) {
      if (isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      let tileAdjusted = false;

      const center = latBandCenter();
      const hw = halfWidthDeg();
      const f = falloff(Math.abs(latDegAbs - center), hw);
      if (f > 0) {
        const base = (t.wetnessDelta as number) ?? 24;
        let coastBoost = 0;
        if (isCoastalLand(x, y)) coastBoost += 6;
        const delta = Math.round((base + coastBoost) * f);
        rf = clamp200(rf + delta);
        applied++;
        tileAdjusted = true;
      }

      if (tileAdjusted) {
        writeRainfall(x, y, rf);
      }
    }
  }

  return applied;
}

