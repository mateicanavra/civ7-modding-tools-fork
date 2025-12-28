import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { assertFoundationDynamics } from "@swooper/mapgen-core";
import { inBounds as boundsCheck } from "@swooper/mapgen-core/lib/grid";
import type { ClimateConfig, FoundationDirectionalityConfig, StoryConfig } from "@swooper/mapgen-core/config";
import { getNarrativeMotifsHotspots, getNarrativeMotifsRifts } from "@mapgen/domain/narrative/queries.js";
import type { OrogenyCache } from "@mapgen/domain/hydrology/climate/types.js";
import { createClimateRuntime } from "@mapgen/domain/hydrology/climate/runtime.js";
import { applyWaterGradientRefinement } from "@mapgen/domain/hydrology/climate/refine/water-gradient.js";
import { applyOrographicShadowRefinement } from "@mapgen/domain/hydrology/climate/refine/orographic-shadow.js";
import { applyRiverCorridorRefinement } from "@mapgen/domain/hydrology/climate/refine/river-corridor.js";
import { applyRiftHumidityRefinement } from "@mapgen/domain/hydrology/climate/refine/rift-humidity.js";
import { applyOrogenyBeltsRefinement } from "@mapgen/domain/hydrology/climate/refine/orogeny-belts.js";
import { applyHotspotMicroclimatesRefinement } from "@mapgen/domain/hydrology/climate/refine/hotspot-microclimates.js";

/**
 * Earthlike rainfall refinements (post-rivers).
 */
export function refineClimateEarthlike(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: {
    orogenyCache?: OrogenyCache;
    climate?: ClimateConfig;
    story?: StoryConfig;
    directionality?: FoundationDirectionalityConfig;
  } = {}
): void {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: refineClimateEarthlike requires MapContext (legacy direct-engine fallback removed)."
    );
  }
  const runtime = createClimateRuntime(width, height, ctx);
  const dynamics = assertFoundationDynamics(ctx, "climateRefine");

  const climateCfg = options.climate ?? {};
  const refineCfg = climateCfg.refine || {};
  const storyMoisture = (climateCfg as Record<string, unknown>).story as
    | Record<string, unknown>
    | undefined;
  const storyRain = (storyMoisture?.rainfall || {}) as Record<string, number>;
  const orogenyCache = options?.orogenyCache || null;
  const storyCfg = options.story ?? {};
  const directionality = options.directionality ?? null;
  const emptySet = new Set<string>();
  const rifts = getNarrativeMotifsRifts(ctx);
  const hotspots = getNarrativeMotifsHotspots(ctx);

  // Local bounds check with captured width/height
  const inBounds = (x: number, y: number): boolean => boundsCheck(x, y, width, height);

  console.log("[Climate Refinement] Using MapContext adapter");

  // Pass A: coastal and lake humidity gradient
  applyWaterGradientRefinement(width, height, runtime, refineCfg as Record<string, unknown>);

  // Pass B: orographic rain shadows with wind model
  applyOrographicShadowRefinement(
    width,
    height,
    runtime,
    refineCfg as Record<string, unknown>,
    dynamics,
    directionality
  );

  // Pass C: river corridor greening and basin humidity
  applyRiverCorridorRefinement(
    width,
    height,
    runtime,
    refineCfg as Record<string, unknown>,
    inBounds
  );

  // Pass D: Rift humidity boost
  applyRiftHumidityRefinement(
    width,
    height,
    runtime,
    inBounds,
    rifts?.riftLine ?? emptySet,
    storyRain
  );

  // Pass E: Orogeny belts (windward/lee)
  applyOrogenyBeltsRefinement(width, height, runtime, orogenyCache, storyCfg);

  // Pass F: Hotspot island microclimates
  applyHotspotMicroclimatesRefinement(
    width,
    height,
    runtime,
    inBounds,
    {
      paradise: hotspots?.paradise ?? emptySet,
      volcanic: hotspots?.volcanic ?? emptySet,
    },
    storyRain
  );
}
