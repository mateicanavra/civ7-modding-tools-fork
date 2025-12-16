import type { SwatchHelpers, SwatchRuntime, SwatchTypeConfig } from "./types.js";

export function applyGreatPlainsSwatch(
  width: number,
  height: number,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers,
  t: SwatchTypeConfig,
  widthMul: number
): number {
  const { readRainfall, writeRainfall } = runtime;
  const { clamp200, isWater, signedLatitudeAt, getElevation } = helpers;

  const falloff = (value: number, radius: number): number =>
    Math.max(0, 1 - value / Math.max(1, radius));

  let applied = 0;

  for (let y = 0; y < height; y++) {
    const latDegAbs = Math.abs(signedLatitudeAt(y));

    for (let x = 0; x < width; x++) {
      if (isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      const elev = getElevation(x, y);
      let tileAdjusted = false;

      const center = (t.latitudeCenterDeg as number) ?? 45;
      const hw = Math.max(6, Math.round(((t.halfWidthDeg as number) ?? 8) * widthMul));
      const f = falloff(Math.abs(latDegAbs - center), hw);
      if (f > 0 && elev <= ((t.lowlandMaxElevation as number) ?? 300)) {
        const dry = (t.dryDelta as number) ?? 12;
        const delta = Math.round(dry * f);
        rf = clamp200(rf - delta);
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

