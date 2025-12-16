import type { ClimateRuntime } from "../types.js";
import { distanceToNearestWater } from "../distance-to-water.js";

export function applyWaterGradientRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  refineCfg: Record<string, unknown>
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const waterGradient = (refineCfg.waterGradient || {}) as Record<string, number>;
  const maxR = (waterGradient?.radius ?? 5) | 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      const dist = distanceToNearestWater(x, y, maxR, adapter, width, height);
      if (dist >= 0) {
        const elev = adapter.getElevation(x, y);
        let bonus = Math.max(0, maxR - dist) * (waterGradient?.perRingBonus ?? 5);
        if (elev < 150) bonus += waterGradient?.lowlandBonus ?? 3;
        rf += bonus;
        writeRainfall(x, y, rf);
      }
    }
  }
}

