import type { SwatchHelpers, SwatchRuntime, SwatchTypeConfig } from "./types.js";

export function applyRainforestArchipelagoSwatch(
  width: number,
  height: number,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers,
  t: SwatchTypeConfig
): number {
  const { readRainfall, writeRainfall } = runtime;
  const { clamp200, isWater, signedLatitudeAt, isCoastalLand } = helpers;

  let applied = 0;

  for (let y = 0; y < height; y++) {
    const latDegAbs = Math.abs(signedLatitudeAt(y));

    for (let x = 0; x < width; x++) {
      if (isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      let tileAdjusted = false;

      const fTropics = latDegAbs < 23 ? 1 : latDegAbs < 30 ? 0.5 : 0;
      if (fTropics > 0) {
        let islandy = 0;
        if (isCoastalLand(x, y)) islandy += 1;
        if (islandy > 0) {
          const base = (t.wetnessDelta as number) ?? 18;
          const delta = Math.round(base * fTropics * islandy);
          rf = clamp200(rf + delta);
          applied++;
          tileAdjusted = true;
        }
      }

      if (tileAdjusted) {
        writeRainfall(x, y, rf);
      }
    }
  }

  return applied;
}

