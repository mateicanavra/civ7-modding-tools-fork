import type { FoundationDynamicsFields } from "@swooper/mapgen-core";
import type { ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";
import { hasUpwindBarrierWM } from "@mapgen/domain/hydrology/climate/orographic-shadow.js";

export function applyOrographicShadowRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  refineCfg: Record<string, unknown>,
  dynamics: FoundationDynamicsFields
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;
  const orographic = refineCfg.orographic as Record<string, number>;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;

      const steps = Math.max(1, (orographic.steps as number) | 0);

      const barrier = hasUpwindBarrierWM(x, y, steps, adapter, width, height, dynamics);

      if (barrier) {
        const rf = readRainfall(x, y);
        const reduction =
          (orographic.reductionBase as number) +
          barrier * (orographic.reductionPerStep as number);
        writeRainfall(x, y, rf - reduction);
      }
    }
  }
}
