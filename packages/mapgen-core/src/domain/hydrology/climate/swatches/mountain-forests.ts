import type { OrogenyCache } from "../types.js";
import type { SwatchHelpers, SwatchRuntime, SwatchTypeConfig } from "./types.js";

export function applyMountainForestsSwatch(
  width: number,
  height: number,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers,
  t: SwatchTypeConfig,
  orogenyCache: OrogenyCache
): number {
  const { readRainfall, writeRainfall } = runtime;
  const { clamp200, isWater, getElevation } = helpers;

  let applied = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      const elev = getElevation(x, y);
      let tileAdjusted = false;

      const windward = !!orogenyCache?.windward?.has?.(`${x},${y}`);
      const lee = !!orogenyCache?.lee?.has?.(`${x},${y}`);
      if (windward) {
        const base = (t.windwardBonus as number) ?? 6;
        const delta = base + (elev < 300 ? 2 : 0);
        rf = clamp200(rf + delta);
        applied++;
        tileAdjusted = true;
      } else if (lee) {
        const base = (t.leePenalty as number) ?? 2;
        rf = clamp200(rf - base);
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

