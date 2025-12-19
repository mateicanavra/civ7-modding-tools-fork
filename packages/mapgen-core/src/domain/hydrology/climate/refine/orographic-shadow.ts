import type { FoundationDirectionalityConfig } from "../../../../bootstrap/types.js";
import type { ExtendedMapContext, FoundationContext } from "../../../../core/types.js";
import type { ClimateRuntime } from "../types.js";
import { hasUpwindBarrierWM } from "../orographic-shadow.js";

export function applyOrographicShadowRefinement(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  runtime: ClimateRuntime,
  refineCfg: Record<string, unknown>,
  dynamics: FoundationContext["dynamics"]
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;
  const orographic = (refineCfg.orographic || {}) as Record<string, number>;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;

      const baseSteps = (orographic?.steps ?? 4) | 0;
      let steps = baseSteps;

      try {
        const DIR = (ctx.config.foundation?.dynamics?.directionality || {}) as FoundationDirectionalityConfig;
        const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        const interplay = (DIR as Record<string, unknown>).interplay as
          | Record<string, number>
          | undefined;
        const windC = Math.max(0, Math.min(1, interplay?.windsFollowPlates ?? 0));
        const extra = Math.round(coh * windC);
        steps = Math.max(1, baseSteps + extra);
      } catch {
        steps = baseSteps;
      }

      const barrier = hasUpwindBarrierWM(x, y, steps, adapter, width, height, dynamics);

      if (barrier) {
        const rf = readRainfall(x, y);
        const reduction =
          (orographic?.reductionBase ?? 8) + barrier * (orographic?.reductionPerStep ?? 6);
        writeRainfall(x, y, rf - reduction);
      }
    }
  }
}
