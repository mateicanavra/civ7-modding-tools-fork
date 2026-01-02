/**
 * Plate-Driven Landmass Generator
 *
 * Crust-first implementation: builds plate topology, assigns crust types, and
 * derives land/water purely from crust + sea level. Boundary closeness is only
 * used as a mask so land does not sit directly on seams; tectonic uplift no
 * longer controls land existence.
 */

import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { assertFoundationPlates } from "@swooper/mapgen-core";
import type {
  CreateLandmassesOptions,
  GeometryConfig,
  GeometryPostConfig,
  LandmassConfig,
  LandmassGenerationResult,
} from "@mapgen/domain/morphology/landmass/types.js";
import { computeTargetLandTiles } from "@mapgen/domain/morphology/landmass/water-target.js";
import { computeClosenessLimit, tryCrustFirstLandmask } from "@mapgen/domain/morphology/landmass/crust-first-landmask.js";
import { applyLandmaskToTerrain } from "@mapgen/domain/morphology/landmass/terrain-apply.js";
import { computePlateStatsFromLandMask } from "@mapgen/domain/morphology/landmass/plate-stats.js";
import { windowsFromPlateStats } from "@mapgen/domain/morphology/landmass/windows.js";
import {
  logCrustFirstDiagnostics,
  logLandmassWindowsSummary,
  logNoWindowsGeneratedDiagnostics,
  LANDMASS_LOG_PREFIX,
} from "@mapgen/domain/morphology/landmass/diagnostics.js";

export type { LandmassTectonicsConfig, LandmassGeometry, LandmassGeometryPost } from "@mapgen/domain/morphology/landmass/types.js";
export type {
  AreaCrustResult,
  CrustFirstResult,
  CrustSummary,
  CreateLandmassesOptions,
  GeometryConfig,
  GeometryPostConfig,
  LandmassConfig,
  LandmassGenerationResult,
  LandmassWindow,
  PlateStats,
} from "@mapgen/domain/morphology/landmass/types.js";

export { applyLandmassPostAdjustments } from "@mapgen/domain/morphology/landmass/post-adjustments.js";
export {
  applyPlateAwareOceanSeparation,
  DEFAULT_OCEAN_SEPARATION,
  type OceanSeparationEdgePolicy,
  type OceanSeparationPolicy,
  type PlateAwareOceanSeparationParams,
  type PlateAwareOceanSeparationResult,
} from "@mapgen/domain/morphology/landmass/ocean-separation/index.js";

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create landmasses using plate stability metrics.
 *
 * @param width - Map width
 * @param height - Map height
 * @param ctx - ExtendedMapContext for adapter-based operations
 * @param options - Optional configuration overrides
 * @returns Landmass generation result (throws if foundation is unavailable)
 */
export function createPlateDrivenLandmasses(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  options: CreateLandmassesOptions = {}
): LandmassGenerationResult | null {
  const plates = assertFoundationPlates(ctx, "landmassPlates");
  const { width: ctxWidth, height: ctxHeight } = ctx.dimensions;
  if (ctxWidth !== width || ctxHeight !== height) {
    throw new Error(
      `[Landmass] Dimensions mismatch (expected ${width}x${height}, received ${ctxWidth}x${ctxHeight}).`
    );
  }

  const closeness = plates.boundaryCloseness;
  const plateIds = plates.id;

  const size = width * height;
  if (plateIds.length !== size) {
    throw new Error(
      `[Landmass] plateId tensor length mismatch (expected ${size}, received ${plateIds.length}).`
    );
  }

  if (closeness.length !== size) {
    throw new Error(
      `[Landmass] boundaryCloseness tensor length mismatch (expected ${size}, received ${closeness.length}).`
    );
  }

  // Cast to our local LandmassConfig which includes extended properties
  const landmassCfg: LandmassConfig = (options.landmassCfg || {}) as LandmassConfig;

  const geomCfg: GeometryConfig = options.geometry || {};
  const postCfg: GeometryPostConfig = geomCfg.post || {};

  const { waterPct, targetLandTiles } = computeTargetLandTiles(size, landmassCfg);

  const closenessLimit = computeClosenessLimit(postCfg);
  const crustResult = tryCrustFirstLandmask(
    width,
    height,
    plateIds,
    closeness,
    closenessLimit,
    targetLandTiles,
    landmassCfg,
    ctx
  );

  if (!crustResult) {
    if (ctx.trace.isVerbose) {
      ctx.trace.event(() => ({
        type: "landmass.crust.error",
        message: `${LANDMASS_LOG_PREFIX} ERROR: Crust-first landmask generation failed (invalid plate data).`,
      }));
    }
    return null;
  }

  const landMask = crustResult.landMask;
  const finalLandTiles = crustResult.landTiles;
  const seaLevel = crustResult.seaLevel;
  applyLandmaskToTerrain(width, height, landMask, ctx, ctx?.adapter ?? null);

  const plateStats = computePlateStatsFromLandMask(width, height, landMask, plateIds);
  const windowsOut = windowsFromPlateStats(plateStats.values(), width, height, postCfg);

  logCrustFirstDiagnostics(ctx.trace, crustResult, size, targetLandTiles, closenessLimit, waterPct);
  logLandmassWindowsSummary(ctx.trace, plateStats.size, windowsOut.length);

  if (windowsOut.length === 0) {
    logNoWindowsGeneratedDiagnostics(
      ctx.trace,
      finalLandTiles,
      plateStats.size,
      seaLevel,
      closenessLimit,
      closeness,
      size,
      plateIds
    );
  }

  let startRegions: LandmassGenerationResult["startRegions"] = undefined;
  if (windowsOut.length >= 2) {
    startRegions = {
      westContinent: { ...windowsOut[0] },
      eastContinent: { ...windowsOut[windowsOut.length - 1] },
    };
  }

  if (ctx?.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }

  return {
    windows: windowsOut,
    startRegions,
    landMask,
    landTiles: finalLandTiles,
  };
}

export default createPlateDrivenLandmasses;
