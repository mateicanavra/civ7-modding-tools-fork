import type { FoundationDirectionalityConfig } from "@swooper/mapgen-core/bootstrap";
import type { FoundationContext } from "@swooper/mapgen-core";
import type { ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";
import { hasUpwindBarrierWM } from "@mapgen/domain/hydrology/climate/orographic-shadow.js";

export function applyOrographicShadowRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  refineCfg: Record<string, unknown>,
  dynamics: FoundationContext["dynamics"],
  directionality: FoundationDirectionalityConfig | null | undefined
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;
  const orographic = (refineCfg.orographic || {}) as Record<string, number>;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;

      const baseSteps = (orographic?.steps ?? 4) | 0;
      let steps = baseSteps;

      const DIR = directionality || {};
      const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
      const interplay = (DIR as Record<string, unknown>).interplay as
        | Record<string, number>
        | undefined;
      const windC = Math.max(0, Math.min(1, interplay?.windsFollowPlates ?? 0));
      const extra = Math.round(coh * windC);
      steps = Math.max(1, baseSteps + extra);

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
