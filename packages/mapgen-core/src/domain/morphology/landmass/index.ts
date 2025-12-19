/**
 * Plate-Driven Landmass Generator
 *
 * Crust-first implementation: builds plate topology, assigns crust types, and
 * derives land/water purely from crust + sea level. Boundary closeness is only
 * used as a mask so land does not sit directly on seams; tectonic uplift no
 * longer controls land existence.
 */

import type { ExtendedMapContext } from "../../../core/types.js";
import { assertFoundationContext } from "../../../core/assertions.js";
import type {
  CreateLandmassesOptions,
  GeometryConfig,
  GeometryPostConfig,
  LandmassConfig,
  LandmassGenerationResult,
} from "./types.js";
import { normalizeCrustMode, type CrustMode } from "./crust-mode.js";
import { computeTargetLandTiles } from "./water-target.js";
import { computeClosenessLimit, tryCrustFirstLandmask } from "./crust-first-landmask.js";
import { applyLandmaskToTerrain } from "./terrain-apply.js";
import { computePlateStatsFromLandMask } from "./plate-stats.js";
import { windowsFromPlateStats } from "./windows.js";
import {
  logCrustFirstDiagnostics,
  logLandmassWindowsSummary,
  logNoWindowsGeneratedDiagnostics,
  LANDMASS_LOG_PREFIX,
} from "./diagnostics.js";

export type { LandmassTectonicsConfig, LandmassGeometry, LandmassGeometryPost } from "./types.js";
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
} from "./types.js";
export { normalizeCrustMode, type CrustMode } from "./crust-mode.js";

export { applyLandmassPostAdjustments } from "./post-adjustments.js";
export {
  applyPlateAwareOceanSeparation,
  DEFAULT_OCEAN_SEPARATION,
  type OceanSeparationEdgePolicy,
  type OceanSeparationPolicy,
  type PlateAwareOceanSeparationParams,
  type PlateAwareOceanSeparationResult,
} from "./ocean-separation/index.js";

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
 * @returns Landmass generation result or null if WorldModel unavailable
 */
export function createPlateDrivenLandmasses(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  options: CreateLandmassesOptions = {}
): LandmassGenerationResult | null {
  assertFoundationContext(ctx, "landmassPlates");
  const { width: ctxWidth, height: ctxHeight } = ctx.dimensions;
  if (ctxWidth !== width || ctxHeight !== height) {
    throw new Error(
      `[Landmass] Dimensions mismatch (expected ${width}x${height}, received ${ctxWidth}x${ctxHeight}).`
    );
  }

  const foundation = ctx.foundation;
  const { plates } = foundation;
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
  const landmassCfg: LandmassConfig = (options.landmassCfg ||
    (ctx?.config?.landmass as unknown as LandmassConfig) ||
    {}) as LandmassConfig;

  const geomCfg: GeometryConfig = options.geometry || {};
  const postCfg: GeometryPostConfig = geomCfg.post || {};

  const { waterPct, targetLandTiles } = computeTargetLandTiles(size, landmassCfg);

  const foundationCfg = ctx.config.foundation as {
    crustMode?: CrustMode;
    surface?: { crustMode?: CrustMode; landmass?: { crustMode?: CrustMode } };
  };
  const crustMode = normalizeCrustMode(
    landmassCfg.crustMode ??
      foundationCfg?.crustMode ??
      foundationCfg?.surface?.crustMode ??
      foundationCfg?.surface?.landmass?.crustMode
  );

  const closenessLimit = computeClosenessLimit(postCfg);
  const crustResult = tryCrustFirstLandmask(
    width,
    height,
    plateIds,
    closeness,
    closenessLimit,
    targetLandTiles,
    landmassCfg,
    crustMode,
    ctx
  );

  if (!crustResult) {
    console.log(
      `${LANDMASS_LOG_PREFIX} ERROR: Crust-first landmask generation failed (invalid plate data).`
    );
    return null;
  }

  const landMask = crustResult.landMask;
  const finalLandTiles = crustResult.landTiles;
  const seaLevel = crustResult.seaLevel;
  applyLandmaskToTerrain(width, height, landMask, ctx, ctx?.adapter ?? null);

  const plateStats = computePlateStatsFromLandMask(width, height, landMask, plateIds);
  const windowsOut = windowsFromPlateStats(plateStats.values(), width, height, postCfg);

  logCrustFirstDiagnostics(crustResult, size, targetLandTiles, closenessLimit, waterPct);
  logLandmassWindowsSummary(plateStats.size, windowsOut.length);

  if (windowsOut.length === 0) {
    logNoWindowsGeneratedDiagnostics(
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
