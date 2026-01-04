import { clamp } from "@swooper/mapgen-core/lib/math";
import type { ClimateRuntime, OrogenyCache } from "@mapgen/domain/hydrology/climate/types.js";
import type { StoryConfig } from "@mapgen/domain/config";

export function applyOrogenyBeltsRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  orogenyCache: OrogenyCache | null,
  storyConfig: StoryConfig
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const orogenyTunables = storyConfig.orogeny as Record<string, number>;

  if (orogenyCache !== null) {
    const windwardSet = orogenyCache.windward;
    const leeSet = orogenyCache.lee;
    const hasWindward = (windwardSet?.size ?? 0) > 0;
    const hasLee = (leeSet?.size ?? 0) > 0;

    if (hasWindward || hasLee) {
      const windwardBoost = orogenyTunables.windwardBoost as number;
      const leeAmp = orogenyTunables.leeDrynessAmplifier as number;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;
          let rf = readRainfall(x, y);
          const key = `${x},${y}`;

          if (hasWindward && windwardSet && windwardSet.has(key)) {
            rf = clamp(rf + windwardBoost, 0, 200);
          }
          if (hasLee && leeSet && leeSet.has(key)) {
            const baseSubtract = 8;
            const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
            rf = clamp(rf - (baseSubtract + extra), 0, 200);
          }
          writeRainfall(x, y, rf);
        }
      }
    }
  }
}
