import { clamp } from "../../../../lib/math/clamp.js";
import type { ExtendedMapContext } from "../../../../core/types.js";
import type { ClimateRuntime, OrogenyCache } from "../types.js";

export function applyOrogenyBeltsRefinement(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  runtime: ClimateRuntime,
  orogenyCache: OrogenyCache | null
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const storyTunables = (ctx.config.story || {}) as Record<string, unknown>;
  const orogenyTunables = (storyTunables.orogeny || {}) as Record<string, number>;

  if (ctx.config.toggles?.STORY_ENABLE_OROGENY && orogenyCache !== null) {
    const windwardSet = orogenyCache.windward;
    const leeSet = orogenyCache.lee;
    const hasWindward = (windwardSet?.size ?? 0) > 0;
    const hasLee = (leeSet?.size ?? 0) > 0;

    if (hasWindward || hasLee) {
      const windwardBoost = orogenyTunables?.windwardBoost ?? 5;
      const leeAmp = orogenyTunables?.leeDrynessAmplifier ?? 1.2;

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

