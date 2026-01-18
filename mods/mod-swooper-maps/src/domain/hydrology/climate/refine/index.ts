import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { inBounds as boundsCheck } from "@swooper/mapgen-core/lib/grid";
import type { ClimateConfig } from "@mapgen/domain/config";
import { createClimateRuntime } from "@mapgen/domain/hydrology/climate/runtime.js";
import { applyWaterGradientRefinement } from "@mapgen/domain/hydrology/climate/refine/water-gradient.js";
import { applyOrographicShadowRefinement } from "@mapgen/domain/hydrology/climate/refine/orographic-shadow.js";
import { applyRiverCorridorRefinement } from "@mapgen/domain/hydrology/climate/refine/river-corridor.js";
import type { HydrologyWindFields } from "@mapgen/domain/hydrology/ops/compute-wind-fields/contract.js";

/**
 * Earthlike rainfall refinements (post-rivers).
 */
export function refineClimateEarthlike(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: {
    climate?: ClimateConfig;
    wind?: HydrologyWindFields;
    riverAdjacency?: Uint8Array | null;
  } = {}
): void {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: refineClimateEarthlike requires MapContext (legacy direct-engine fallback removed)."
    );
  }
  const runtime = createClimateRuntime(width, height, ctx, {
    riverAdjacency: options.riverAdjacency,
  });
  const wind = options.wind;
  if (!wind) {
    throw new Error("refineClimateEarthlike requires hydrology wind fields.");
  }

  if (!options.climate) {
    throw new Error("refineClimateEarthlike requires climate config.");
  }
  const climateCfg = options.climate;
  const refineCfg = climateCfg.refine as Record<string, unknown>;

  // Local bounds check with captured width/height
  const inBounds = (x: number, y: number): boolean => boundsCheck(x, y, width, height);

  if (ctx.trace.isVerbose) {
    ctx.trace.event(() => ({
      type: "climate.refine.start",
      message: "[Climate Refinement] Using MapContext adapter",
    }));
  }

  // Pass A: coastal and lake humidity gradient
  applyWaterGradientRefinement(width, height, runtime, refineCfg as Record<string, unknown>);

  // Pass B: orographic rain shadows with wind model
  applyOrographicShadowRefinement(
    width,
    height,
    runtime,
    refineCfg as Record<string, unknown>,
    wind
  );

  // Pass C: river corridor greening and basin humidity
  applyRiverCorridorRefinement(
    width,
    height,
    runtime,
    refineCfg as Record<string, unknown>,
    inBounds
  );
}
