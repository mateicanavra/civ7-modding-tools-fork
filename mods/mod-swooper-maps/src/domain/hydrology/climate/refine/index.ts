import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { FoundationDynamicsFields } from "@swooper/mapgen-core";
import { inBounds as boundsCheck } from "@swooper/mapgen-core/lib/grid";
import type { ClimateConfig, StoryConfig } from "@mapgen/domain/config";
import type {
  NarrativeMotifsHotspots,
  NarrativeMotifsRifts,
} from "@mapgen/domain/narrative/models.js";
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
    dynamics?: FoundationDynamicsFields;
    rifts?: NarrativeMotifsRifts | null;
    hotspots?: NarrativeMotifsHotspots | null;
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
  const dynamics = options.dynamics;
  if (!dynamics) {
    throw new Error("refineClimateEarthlike requires foundation dynamics.");
  }

  if (!options.climate) {
    throw new Error("refineClimateEarthlike requires climate config.");
  }
  const climateCfg = options.climate;
  const refineCfg = climateCfg.refine as Record<string, unknown>;
  const storyMoisture = (climateCfg as Record<string, unknown>).story as Record<string, unknown>;
  const storyRain = storyMoisture.rainfall as Record<string, number>;
  const orogenyCache = options?.orogenyCache || null;
  const storyCfg = options.story as StoryConfig;
  const emptySet = new Set<string>();
  const rifts = options.rifts ?? null;
  const hotspots = options.hotspots ?? null;

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
    dynamics
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
