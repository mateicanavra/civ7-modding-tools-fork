import type { ExtendedMapContext } from "../../../../core/types.js";
import { assertFoundationContext } from "../../../../core/assertions.js";
import { inBounds as boundsCheck } from "../../../../lib/grid/bounds.js";
import type { StoryTagsInstance } from "../../../narrative/tags/instance.js";
import { getStoryTags } from "../../../narrative/tags/index.js";
import type { OrogenyCache } from "../types.js";
import { createClimateRuntime } from "../runtime.js";
import { applyWaterGradientRefinement } from "./water-gradient.js";
import { applyOrographicShadowRefinement } from "./orographic-shadow.js";
import { applyRiverCorridorRefinement } from "./river-corridor.js";
import { applyRiftHumidityRefinement } from "./rift-humidity.js";
import { applyOrogenyBeltsRefinement } from "./orogeny-belts.js";
import { applyHotspotMicroclimatesRefinement } from "./hotspot-microclimates.js";

/**
 * Earthlike rainfall refinements (post-rivers).
 */
export function refineClimateEarthlike(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: { orogenyCache?: OrogenyCache } = {}
): void {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: refineClimateEarthlike requires MapContext (legacy direct-engine fallback removed)."
    );
  }
  assertFoundationContext(ctx, "climateRefine");
  const runtime = createClimateRuntime(width, height, ctx);
  const { dynamics } = ctx.foundation;

  const climateCfg = ctx.config.climate || {};
  const refineCfg = climateCfg.refine || {};
  const storyMoisture = (climateCfg as Record<string, unknown>).story as
    | Record<string, unknown>
    | undefined;
  const storyRain = (storyMoisture?.rainfall || {}) as Record<string, number>;
  const orogenyCache = options?.orogenyCache || null;

  const StoryTags: StoryTagsInstance = getStoryTags(ctx);

  // Local bounds check with captured width/height
  const inBounds = (x: number, y: number): boolean => boundsCheck(x, y, width, height);

  console.log("[Climate Refinement] Using MapContext adapter");

  // Pass A: coastal and lake humidity gradient
  applyWaterGradientRefinement(width, height, runtime, refineCfg as Record<string, unknown>);

  // Pass B: orographic rain shadows with wind model
  applyOrographicShadowRefinement(
    width,
    height,
    ctx,
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
  applyRiftHumidityRefinement(width, height, runtime, inBounds, StoryTags, storyRain);

  // Pass E: Orogeny belts (windward/lee)
  applyOrogenyBeltsRefinement(width, height, ctx, runtime, orogenyCache);

  // Pass F: Hotspot island microclimates
  applyHotspotMicroclimatesRefinement(width, height, runtime, inBounds, StoryTags, storyRain);
}
