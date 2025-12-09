/**
 * Plate-Driven Landmass Generator
 *
 * Crust-first implementation: builds plate topology, assigns crust types, and
 * derives land/water purely from crust + sea level. Boundary closeness is only
 * used as a mask so land does not sit directly on seams; tectonic uplift no
 * longer controls land existence.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type {
  LandmassConfig as BootstrapLandmassConfig,
  LandmassTectonicsConfig,
  LandmassGeometry,
  LandmassGeometryPost,
} from "../bootstrap/types.js";
import { ctxRandom, writeHeightfield } from "../core/types.js";
import { getTunables } from "../bootstrap/tunables.js";
import { buildPlateTopology } from "../lib/plates/topology.js";
import { assignCrustTypes, CrustType } from "../lib/plates/crust.js";
import { generateBaseHeightfield } from "../lib/heightfield/base.js";
import { computeSeaLevel } from "../lib/heightfield/sea-level.js";
import type { LandmassWindow } from "./landmass-utils.js";

// ============================================================================
// Types
// ============================================================================

// Re-export canonical types
export type { LandmassTectonicsConfig, LandmassGeometry, LandmassGeometryPost };

/** Landmass generation configuration (re-export canonical type) */
export type LandmassConfig = BootstrapLandmassConfig;

/** Tectonic noise configuration (alias for LandmassTectonicsConfig) */
export type TectonicsConfig = LandmassTectonicsConfig;

/** Geometry configuration (alias for LandmassGeometry) */
export type GeometryConfig = LandmassGeometry;

/** Geometry post-processing configuration (alias for LandmassGeometryPost) */
export type GeometryPostConfig = LandmassGeometryPost;

/** Options for createPlateDrivenLandmasses */
export interface CreateLandmassesOptions {
  landmassCfg?: Partial<LandmassConfig>;
  geometry?: GeometryConfig;
}

/** Result of landmass generation */
export interface LandmassGenerationResult {
  windows: LandmassWindow[];
  startRegions?: {
    westContinent?: LandmassWindow;
    eastContinent?: LandmassWindow;
  };
  landMask: Uint8Array;
  landTiles?: number;
  threshold?: number;
}

/** Internal plate statistics */
interface PlateStats {
  plateId: number;
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLOSENESS_LIMIT = 255;
const CLOSENESS_STEP_PER_TILE = 8;
const MIN_CLOSENESS_LIMIT = 150;
const MAX_CLOSENESS_LIMIT = 255;

// Terrain type constants
const OCEAN_TERRAIN = 0;
const FLAT_TERRAIN = 3;

// ============================================================================
// Helper Functions
// ============================================================================

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clampPct(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number | undefined, fallback: number = 0): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function computeClosenessLimit(postCfg: GeometryPostConfig | undefined): number {
  const expand = postCfg?.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
  const limit = DEFAULT_CLOSENESS_LIMIT + expand * CLOSENESS_STEP_PER_TILE;
  return clampInt(limit, MIN_CLOSENESS_LIMIT, MAX_CLOSENESS_LIMIT);
}

interface CrustFirstResult {
  landMask: Uint8Array;
  landTiles: number;
  seaLevel: number;
  plateCount: number;
  continentalPlates: number;
  baseHeightRange: { min: number; max: number };
  crustConfigApplied: {
    continentalFraction: number;
    clusteringBias: number;
    microcontinentChance: number;
    edgeBlend: number;
    noiseAmplitude: number;
    continentalHeight: number;
    oceanicHeight: number;
  };
}

function tryCrustFirstLandmask(
  width: number,
  height: number,
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[],
  closeness: Uint8Array | null,
  closenessLimit: number,
  targetLandTiles: number,
  landmassCfg: LandmassConfig,
  ctx?: ExtendedMapContext | null
): CrustFirstResult | null {
  const size = width * height;
  if (plateIds.length !== size) return null;
  if (closeness && closeness.length !== size) return null;

  // Plate count derived from raster IDs
  let maxPlateId = -1;
  for (let i = 0; i < size; i++) {
    const id = plateIds[i];
    if (id > maxPlateId) maxPlateId = id;
  }

  const plateCount = maxPlateId + 1;
  if (plateCount <= 0) return null;

  const continentalFraction = clamp01(
    (landmassCfg.continentalFraction as number) ??
      (landmassCfg.crustContinentalFraction as number) ??
      targetLandTiles / size,
    targetLandTiles / size
  );
  const clusteringBias = clamp01((landmassCfg.crustClusteringBias as number) ?? 0.7, 0.7);
  const microcontinentChance = clamp01((landmassCfg.microcontinentChance as number) ?? 0.04, 0.04);
  const edgeBlend = clamp01((landmassCfg.crustEdgeBlend as number) ?? 0.45, 0.45);
  const noiseAmplitude = clamp01((landmassCfg.crustNoiseAmplitude as number) ?? 0.08, 0.08);
  const continentalHeight = Number.isFinite(landmassCfg.continentalHeight)
    ? (landmassCfg.continentalHeight as number)
    : 0.32;
  const oceanicHeight = Number.isFinite(landmassCfg.oceanicHeight)
    ? (landmassCfg.oceanicHeight as number)
    : -0.55;

  const graph = buildPlateTopology(plateIds, width, height, plateCount);
  const crustTypes = assignCrustTypes(graph, ctx ? () => ctxRandom(ctx, "CrustType", 1_000_000) / 1_000_000 : Math.random, {
    continentalFraction,
    microcontinentChance,
    clusteringBias,
  });

  const noiseFn = noiseAmplitude === 0
    ? undefined
    : (x: number, y: number) =>
        ctx ? ctxRandom(ctx, "CrustNoise", 1_000_000) / 1_000_000 : Math.random();

  const baseHeight = generateBaseHeightfield(plateIds, crustTypes, width, height, {
    continentalHeight,
    oceanicHeight,
    edgeBlend,
    noiseAmplitude,
    noiseFn,
  });

  const seaLevel = computeSeaLevel(baseHeight, targetLandTiles);
  const landMask = new Uint8Array(size);

  let landTiles = 0;
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < size; i++) {
    const h = baseHeight[i];
    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;

    const passesCloseness = !closeness || closeness[i] <= closenessLimit;
    const isLand = passesCloseness && h > seaLevel;
    if (isLand) {
      landMask[i] = 1;
      landTiles++;
    }
  }

  const continentalPlates = crustTypes.reduce((acc, t) => acc + (t === CrustType.CONTINENTAL ? 1 : 0), 0);

  return {
    landMask,
    landTiles,
    seaLevel,
    plateCount,
    continentalPlates,
    baseHeightRange: { min: minHeight, max: maxHeight },
    crustConfigApplied: {
      continentalFraction,
      clusteringBias,
      microcontinentChance,
      edgeBlend,
      noiseAmplitude,
      continentalHeight,
      oceanicHeight,
    },
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create landmasses using plate stability metrics.
 *
 * @param width - Map width
 * @param height - Map height
 * @param ctx - Optional ExtendedMapContext for adapter-based operations
 * @param options - Optional configuration overrides
 * @returns Landmass generation result or null if WorldModel unavailable
 */
export function createPlateDrivenLandmasses(
  width: number,
  height: number,
  ctx?: ExtendedMapContext | null,
  options: CreateLandmassesOptions = {}
): LandmassGenerationResult | null {
  // Require foundation context for plate data
  const foundation = ctx?.foundation;
  if (!foundation) {
    return null;
  }

  const { plates } = foundation;
  const closeness = plates.boundaryCloseness || null;
  const plateIds = plates.id;

  if (!plateIds) {
    return null;
  }

  const size = width * height;
  if (plateIds.length !== size) {
    return null;
  }

  if (closeness && closeness.length !== size) {
    return null;
  }

  const tunables = getTunables();
  // Cast to our local LandmassConfig which includes extended properties
  const landmassCfg: LandmassConfig = (options.landmassCfg ||
    (tunables.LANDMASS_CFG as unknown as LandmassConfig) ||
    {}) as LandmassConfig;

  const geomCfg: GeometryConfig = options.geometry || {};
  const postCfg: GeometryPostConfig = geomCfg.post || {};

  // Water coverage calculation
  const baseWaterPct = clampPct(landmassCfg.baseWaterPercent ?? 64, 0, 100, 64);
  const waterScalar =
    clampPct(
      Number.isFinite(landmassCfg.waterScalar) ? landmassCfg.waterScalar! * 100 : 100,
      25,
      175,
      100
    ) / 100;
  const waterPct = clampPct(baseWaterPct * waterScalar, 0, 100, baseWaterPct);
  const totalTiles = size || 1;
  const targetLandTiles = Math.max(
    1,
    Math.min(totalTiles - 1, Math.round(totalTiles * (1 - waterPct / 100)))
  );

  const closenessLimit = computeClosenessLimit(postCfg);
  const adapter = ctx?.adapter;
  const logPrefix = "[landmass-plate]";
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
    console.log(`${logPrefix} ERROR: Crust-first landmask generation failed (invalid plate data).`);
    return null;
  }

  const landMask = crustResult.landMask;
  const finalLandTiles = crustResult.landTiles;
  const seaLevel = crustResult.seaLevel;
  const crustPlateCount = crustResult.plateCount;
  const crustContinentalPlates = crustResult.continentalPlates;
  const crustConfigApplied = crustResult.crustConfigApplied;
  const baseHeightRange = crustResult.baseHeightRange;

  // Apply terrain
  const setTerrain = (
    x: number,
    y: number,
    terrain: number,
    isLand: boolean
  ): void => {
    if (ctx) {
      writeHeightfield(ctx, x, y, {
        terrain,
        elevation: isLand ? 0 : -1,
        isLand,
      });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const isLand = landMask[idx] === 1;

      setTerrain(x, y, isLand ? FLAT_TERRAIN : OCEAN_TERRAIN, isLand);
    }
  }

  // Derive bounding boxes per plate
  const plateStats = new Map<number, PlateStats>();

  for (let idx = 0; idx < size; idx++) {
    if (!landMask[idx]) continue;
    const plateId = plateIds[idx];
    if (plateId == null || plateId < 0) continue;

    const y = Math.floor(idx / width);
    const x = idx - y * width;

    let stat = plateStats.get(plateId);
    if (!stat) {
      stat = {
        plateId,
        count: 0,
        minX: width,
        maxX: -1,
        minY: height,
        maxY: -1,
      };
      plateStats.set(plateId, stat);
    }

    stat.count++;
    if (x < stat.minX) stat.minX = x;
    if (x > stat.maxX) stat.maxX = x;
    if (y < stat.minY) stat.minY = y;
    if (y > stat.maxY) stat.maxY = y;
  }

  const minWidth = postCfg.minWidthTiles ? Math.max(1, Math.trunc(postCfg.minWidthTiles)) : 0;
  const polarRows = 0; // Default, would come from globals if available

  interface WindowWithMeta extends LandmassWindow {
    plateId: number;
    centerX: number;
    count: number;
  }

  const windows: WindowWithMeta[] = Array.from(plateStats.values())
    .filter((s) => s.count > 0 && s.maxX >= s.minX && s.maxY >= s.minY)
    .map((s) => {
      const expand = postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
      const expandWest = postCfg.expandWestTiles ? Math.trunc(postCfg.expandWestTiles) : 0;
      const expandEast = postCfg.expandEastTiles ? Math.trunc(postCfg.expandEastTiles) : 0;

      let west = Math.max(0, s.minX - Math.max(0, expand + expandWest));
      let east = Math.min(width - 1, s.maxX + Math.max(0, expand + expandEast));

      if (minWidth > 0) {
        const span = east - west + 1;
        if (span < minWidth) {
          const deficit = minWidth - span;
          const extraWest = Math.floor(deficit / 2);
          const extraEast = deficit - extraWest;
          west = Math.max(0, west - extraWest);
          east = Math.min(width - 1, east + extraEast);
        }
      }

      if (postCfg.clampWestMin != null) {
        west = Math.max(west, Math.max(0, Math.trunc(postCfg.clampWestMin)));
      }
      if (postCfg.clampEastMax != null) {
        east = Math.min(east, Math.min(width - 1, Math.trunc(postCfg.clampEastMax)));
      }

      const verticalPad = Math.max(0, expand);
      const baseSouth = Math.max(polarRows, s.minY - verticalPad);
      const baseNorth = Math.min(height - polarRows, s.maxY + verticalPad);

      const south =
        postCfg.overrideSouth != null
          ? clampInt(Math.trunc(postCfg.overrideSouth), 0, height - 1)
          : clampInt(baseSouth, 0, height - 1);
      const north =
        postCfg.overrideNorth != null
          ? clampInt(Math.trunc(postCfg.overrideNorth), 0, height - 1)
          : clampInt(baseNorth, 0, height - 1);

      return {
        plateId: s.plateId,
        west,
        east,
        south,
        north,
        centerX: (west + east) * 0.5,
        count: s.count,
        continent: 0, // Will be assigned below
      };
    })
    .sort((a, b) => a.centerX - b.centerX);

  const windowsOut: LandmassWindow[] = windows.map((win, index) => ({
    west: win.west,
    east: win.east,
    south: win.south,
    north: win.north,
    continent: index,
  }));

  // Debug logging for landmass generation diagnostics
  const seaLevelStr = seaLevel != null && Number.isFinite(seaLevel) ? seaLevel.toFixed(3) : "n/a";
  const applied = crustConfigApplied;
  console.log(
    `${logPrefix} Crust-first stats: seaLevel=${seaLevelStr}, landTiles=${finalLandTiles}/${size} (${((finalLandTiles / size) * 100).toFixed(1)}%)`
  );
  console.log(
    `${logPrefix} Crust config: plates=${crustContinentalPlates}/${crustPlateCount} continental, edgeBlend=${applied ? applied.edgeBlend.toFixed(2) : "n/a"}, noise=${applied ? applied.noiseAmplitude.toFixed(2) : "n/a"}, heights=[${applied ? applied.oceanicHeight.toFixed(2) : "n/a"},${applied ? applied.continentalHeight.toFixed(2) : "n/a"}], closenessLimit=${closenessLimit}, targetLandTiles=${targetLandTiles}, waterPct=${waterPct.toFixed(1)}%`
  );
  if (baseHeightRange) {
    console.log(
      `${logPrefix} Height range: [${baseHeightRange.min.toFixed(3)},${baseHeightRange.max.toFixed(3)}]`
    );
  }

  console.log(`${logPrefix} Plates with land: ${plateStats.size}, windows generated: ${windowsOut.length}`);

  // Detailed debug when no windows generated (helps diagnose failures)
  // Note: Using console.log instead of console.warn - Civ7's V8 doesn't have console.warn
  if (windowsOut.length === 0) {
    console.log(`${logPrefix} WARNING: No landmass windows generated!`);
    console.log(`${logPrefix}   - finalLandTiles: ${finalLandTiles}`);
    console.log(`${logPrefix}   - plateStats entries: ${plateStats.size}`);
    console.log(`${logPrefix}   - seaLevel: ${seaLevel}`);
    console.log(`${logPrefix}   - closenessLimit: ${closenessLimit}`);

    // Sample some closeness values to understand the distribution
    const closenessAboveLimit = closeness
      ? closeness.filter((v) => v > closenessLimit).length
      : 0;
    if (closeness) {
      console.log(`${logPrefix}   - tiles with closeness > ${closenessLimit}: ${closenessAboveLimit}/${size}`);
    }

    // Check if plates array has valid IDs
    const validPlateIds = new Set<number>();
    for (let i = 0; i < size; i++) {
      if (plateIds[i] >= 0) validPlateIds.add(plateIds[i]);
    }
    console.log(`${logPrefix}   - unique valid plate IDs: ${validPlateIds.size}`);
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
