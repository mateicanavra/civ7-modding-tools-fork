import type { SwatchHelpers, SwatchRuntime, SwatchTypeConfig } from "@mapgen/domain/hydrology/climate/swatches/types.js";

export function applyMacroDesertBeltSwatch(
  width: number,
  height: number,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers,
  t: SwatchTypeConfig,
  widthMul: number
): number {
  const { readRainfall, writeRainfall } = runtime;
  const { clamp200, isWater, signedLatitudeAt, getElevation } = helpers;

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
      const elev = getElevation(x, y);
      let tileAdjusted = false;

      const center = latBandCenter();
      const hw = halfWidthDeg();
      const f = falloff(Math.abs(latDegAbs - center), hw);
      if (f > 0) {
        const base = (t.drynessDelta as number) ?? 28;
        const lowlandBonus = elev < 250 ? 4 : 0;
        const delta = Math.round((base + lowlandBonus) * f);
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

