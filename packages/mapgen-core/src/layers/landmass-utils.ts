/**
 * Landmass Utils — Shared helpers for landmass generation
 *
 * Provides post-processing utilities for landmass windows and
 * plate-aware ocean separation logic.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type {
  LandmassGeometryPost,
  LandmassGeometry,
  OceanSeparationConfig,
  OceanSeparationEdgePolicy,
} from "../bootstrap/types.js";
import { writeHeightfield } from "../core/types.js";
import { getTunables } from "../bootstrap/tunables.js";

// ============================================================================
// Types
// ============================================================================

/** Landmass bounding window */
export interface LandmassWindow {
  west: number;
  east: number;
  south: number;
  north: number;
  continent: number;
}

// Re-export canonical types for convenience
export type { LandmassGeometryPost, LandmassGeometry, OceanSeparationConfig, OceanSeparationEdgePolicy };

/** Geometry post-processing configuration (alias for LandmassGeometryPost) */
export type GeometryPostConfig = LandmassGeometryPost;

/** Geometry configuration with post block (alias for LandmassGeometry) */
export type GeometryConfig = LandmassGeometry;

/** Ocean separation policy (alias for OceanSeparationConfig) */
export type OceanSeparationPolicy = OceanSeparationConfig;

/** Parameters for plate-aware ocean separation */
export interface PlateAwareOceanSeparationParams {
  width: number;
  height: number;
  windows: ReadonlyArray<Partial<LandmassWindow>>;
  landMask?: Uint8Array | null;
  context?: ExtendedMapContext | null;
  adapter?: Pick<EngineAdapter, "setTerrainType"> | null;
  policy?: OceanSeparationPolicy | null;
  crustMode?: CrustMode;
}

/** Result of plate-aware ocean separation */
export interface PlateAwareOceanSeparationResult {
  windows: LandmassWindow[];
  landMask?: Uint8Array;
}

/** Internal row state for ocean separation */
interface RowState {
  index: number;
  west: Int16Array;
  east: Int16Array;
  south: number;
  north: number;
  continent: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default ocean separation policy */
const DEFAULT_OCEAN_SEPARATION: OceanSeparationPolicy = {
  enabled: true,
  bandPairs: [
    [0, 1],
    [1, 2],
  ],
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1.0,
  maxPerRowDelta: 3,
};

// Terrain type constants - imported from shared module (matched to Civ7 terrain.xml)
import { OCEAN_TERRAIN, FLAT_TERRAIN } from "../core/terrain-constants.js";

// ============================================================================
// Helper Functions
// ============================================================================

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type CrustMode = "legacy" | "area";

function normalizeCrustMode(mode: unknown): CrustMode {
  return mode === "area" ? "area" : "legacy";
}

function normalizeWindow(
  win: Partial<LandmassWindow> | null | undefined,
  index: number,
  width: number,
  height: number
): LandmassWindow {
  if (!win) {
    return {
      west: 0,
      east: Math.max(0, width - 1),
      south: 0,
      north: Math.max(0, height - 1),
      continent: index,
    };
  }
  const west = clampInt(win.west ?? 0, 0, width - 1);
  const east = clampInt(win.east ?? width - 1, 0, width - 1);
  const south = clampInt(win.south ?? 0, 0, height - 1);
  const north = clampInt(win.north ?? height - 1, 0, height - 1);
  return {
    west: Math.min(west, east),
    east: Math.max(west, east),
    south: Math.min(south, north),
    north: Math.max(south, north),
    continent: win.continent ?? index,
  };
}

function createRowState(
  win: Partial<LandmassWindow> | null | undefined,
  index: number,
  width: number,
  height: number
): RowState {
  const normalized = normalizeWindow(win, index, width, height);
  const west = new Int16Array(height);
  const east = new Int16Array(height);
  for (let y = 0; y < height; y++) {
    west[y] = normalized.west;
    east[y] = normalized.east;
  }
  return {
    index,
    west,
    east,
    south: normalized.south,
    north: normalized.north,
    continent: normalized.continent,
  };
}

function aggregateRowState(
  state: RowState,
  width: number,
  height: number
): LandmassWindow {
  let minWest = width - 1;
  let maxEast = 0;
  const south = clampInt(state.south, 0, height - 1);
  const north = clampInt(state.north, 0, height - 1);
  for (let y = south; y <= north; y++) {
    if (state.west[y] > state.east[y]) continue;
    if (state.west[y] < minWest) minWest = state.west[y];
    if (state.east[y] > maxEast) maxEast = state.east[y];
  }

  if (maxEast < minWest) {
    return {
      west: 0,
      east: 0,
      south,
      north,
      continent: state.continent,
    };
  }

  return {
    west: clampInt(minWest, 0, width - 1),
    east: clampInt(maxEast, 0, width - 1),
    south,
    north,
    continent: state.continent,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Apply geometry post-processing adjustments defined in config.
 *
 * @param windows - Array of landmass windows to adjust
 * @param geometry - Geometry configuration with post block
 * @param width - Map width
 * @param height - Map height
 * @returns Adjusted windows (or original if no changes)
 */
export function applyLandmassPostAdjustments(
  windows: LandmassWindow[],
  geometry: GeometryConfig | null | undefined,
  width: number,
  height: number
): LandmassWindow[] {
  if (!Array.isArray(windows) || windows.length === 0) return windows;

  const post = geometry?.post;
  if (!post || typeof post !== "object") return windows;

  const expandAll = Number.isFinite(post.expandTiles)
    ? Math.trunc(post.expandTiles!)
    : 0;
  const expandWest = Number.isFinite(post.expandWestTiles)
    ? Math.trunc(post.expandWestTiles!)
    : 0;
  const expandEast = Number.isFinite(post.expandEastTiles)
    ? Math.trunc(post.expandEastTiles!)
    : 0;
  const clampWest =
    Number.isFinite(post.clampWestMin)
      ? Math.max(0, Math.trunc(post.clampWestMin!))
      : null;
  const clampEast =
    Number.isFinite(post.clampEastMax)
      ? Math.min(width - 1, Math.trunc(post.clampEastMax!))
      : null;
  const overrideSouth =
    Number.isFinite(post.overrideSouth)
      ? clampInt(Math.trunc(post.overrideSouth!), 0, height - 1)
      : null;
  const overrideNorth =
    Number.isFinite(post.overrideNorth)
      ? clampInt(Math.trunc(post.overrideNorth!), 0, height - 1)
      : null;
  const minWidth =
    Number.isFinite(post.minWidthTiles)
      ? Math.max(0, Math.trunc(post.minWidthTiles!))
      : null;

  let changed = false;
  const adjusted = windows.map((win) => {
    if (!win) return win;

    let west = clampInt(win.west | 0, 0, width - 1);
    let east = clampInt(win.east | 0, 0, width - 1);
    let south = clampInt(win.south | 0, 0, height - 1);
    let north = clampInt(win.north | 0, 0, height - 1);

    const expansionWest = expandAll + expandWest;
    const expansionEast = expandAll + expandEast;

    if (expansionWest > 0) west = clampInt(west - expansionWest, 0, width - 1);
    if (expansionEast > 0) east = clampInt(east + expansionEast, 0, width - 1);
    if (clampWest != null) west = Math.max(west, clampWest);
    if (clampEast != null) east = Math.min(east, clampEast);

    if (minWidth != null && minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = clampInt(west - extraWest, 0, width - 1);
        east = clampInt(east + extraEast, 0, width - 1);
      }
    }

    if (overrideSouth != null) south = overrideSouth;
    if (overrideNorth != null) north = overrideNorth;

    const mutated =
      west !== win.west ||
      east !== win.east ||
      south !== win.south ||
      north !== win.north;

    if (mutated) changed = true;
    if (!mutated) return win;

    return {
      west,
      east,
      south,
      north,
      continent: win.continent,
    };
  });

  return changed ? adjusted : windows;
}

/**
 * Apply plate-aware ocean separation to landmasses after generation.
 *
 * Widens or narrows ocean channels based on WorldModel boundary closeness,
 * mutating both the supplied land mask (when available) and returning updated
 * landmass windows for downstream consumers.
 *
 * @param params - Ocean separation parameters
 * @returns Updated windows and optionally the modified land mask
 */
export function applyPlateAwareOceanSeparation(
  params: PlateAwareOceanSeparationParams
): PlateAwareOceanSeparationResult {
  const width = params?.width | 0;
  const height = params?.height | 0;
  const windows = Array.isArray(params?.windows) ? params.windows : [];

  if (!width || !height || windows.length === 0) {
    return {
      windows: windows.map((win, idx) => normalizeWindow(win, idx, width, height)),
    };
  }

  const ctx = params?.context ?? null;
  const adapter =
    params?.adapter && typeof params.adapter.setTerrainType === "function"
      ? params.adapter
      : null;

  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG as {
    oceanSeparation?: OceanSeparationPolicy;
    policy?: { oceanSeparation?: OceanSeparationPolicy; crustMode?: CrustMode };
    crustMode?: CrustMode;
    surface?: { crustMode?: CrustMode; landmass?: { crustMode?: CrustMode } };
  };

  // Prefer explicit policy passed at callsite, then foundation-level config.
  // Support both FOUNDATION_CFG.oceanSeparation and FOUNDATION_CFG.policy.oceanSeparation
  // to mirror the legacy WorldModel.policy.oceanSeparation wiring.
  const foundationPolicy =
    foundationCfg?.oceanSeparation ?? foundationCfg?.policy?.oceanSeparation;

  const policy = params?.policy || foundationPolicy || DEFAULT_OCEAN_SEPARATION;
  const normalizedWindows = windows.map((win, idx) => normalizeWindow(win, idx, width, height));

  // Require foundation context for plate data
  const foundation = ctx?.foundation;
  if (
    !policy ||
    !policy.enabled ||
    !foundation
  ) {
    return {
      windows: normalizedWindows,
      landMask: params?.landMask ?? undefined,
    };
  }

  const landMask =
    params?.landMask instanceof Uint8Array && params.landMask.length === width * height
      ? params.landMask
      : null;

  const heightfield = ctx?.buffers?.heightfield;

  const setTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;

    if (landMask) {
      landMask[idx] = isLand ? 1 : 0;
    }

    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }

    if (heightfield && !landMask) {
      heightfield.landMask[idx] = isLand ? 1 : 0;
    }
  };

  const crustMode = normalizeCrustMode(
    params?.crustMode ??
      foundationCfg?.crustMode ??
      foundationCfg?.policy?.crustMode ??
      foundationCfg?.surface?.crustMode ??
      foundationCfg?.surface?.landmass?.crustMode
  );

  if (crustMode === "area") {
    const minChannelWidth = Math.max(1, (policy.minChannelWidth ?? 3) | 0);
    const channelJitter = Math.max(0, (policy.channelJitter ?? 0) | 0);
    const rowStates = normalizedWindows.map((win, idx) => createRowState(win, idx, width, height));

    for (let i = 0; i < rowStates.length - 1; i++) {
      const left = rowStates[i];
      const right = rowStates[i + 1];
      if (!left || !right) continue;

      const rowStart = Math.max(0, Math.max(left.south, right.south));
      const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
      if (rowStart > rowEnd) continue;

      for (let y = rowStart; y <= rowEnd; y++) {
        const baseCenter = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
        const span = channelJitter * 2 + 1;
        const jitter = channelJitter > 0 ? ((y + i) % span) - channelJitter : 0;
        const center = clampInt(baseCenter + jitter, 0, width - 1);
        const halfWidth = Math.max(0, Math.floor((minChannelWidth - 1) / 2));

        let start = clampInt(center - halfWidth, 0, width - 1);
        let end = clampInt(start + minChannelWidth - 1, 0, width - 1);
        if (end >= width) {
          end = width - 1;
          start = Math.max(0, end - minChannelWidth + 1);
        }

        for (let x = start; x <= end; x++) {
          setTerrain(x, y, OCEAN_TERRAIN, false);
        }

        if (start <= left.west[y]) {
          left.east[y] = left.west[y] - 1;
        } else {
          left.east[y] = clampInt(Math.min(left.east[y], start - 1), 0, width - 1);
        }

        if (end >= right.east[y]) {
          right.west[y] = right.east[y] + 1;
        } else {
          right.west[y] = clampInt(Math.max(right.west[y], end + 1), 0, width - 1);
        }
      }
    }

    const normalized = rowStates.map((state) => aggregateRowState(state, width, height));

    if (ctx && landMask && heightfield?.landMask) {
      heightfield.landMask.set(landMask);
    }

    return {
      windows: normalized,
      landMask: landMask ?? undefined,
    };
  }

  const closeness = foundation.plates.boundaryCloseness;
  if (!closeness || closeness.length !== width * height) {
    return {
      windows: normalizedWindows,
      landMask: landMask ?? undefined,
    };
  }

  const bandPairs =
    Array.isArray(policy.bandPairs) && policy.bandPairs.length
      ? policy.bandPairs
      : [
          [0, 1],
          [1, 2],
        ];

  const baseSeparation = Math.max(0, (policy.baseSeparationTiles ?? 0) | 0);
  const closenessMultiplier = Number.isFinite(policy.boundaryClosenessMultiplier)
    ? policy.boundaryClosenessMultiplier!
    : 1.0;
  const maxPerRow = Math.max(0, (policy.maxPerRowDelta ?? 3) | 0);

  const rowStates = normalizedWindows.map((win, idx) => createRowState(win, idx, width, height));

  const carveOceanFromEast = (state: RowState, y: number, tiles: number): number => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state.east[y];
    const limit = state.west[y];
    const rowOffset = y * width;
    while (removed < tiles && x >= limit) {
      const idx = rowOffset + x;
      if (!landMask || landMask[idx]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x--;
    }
    state.east[y] = clampInt(state.east[y] - removed, limit, width - 1);
    return removed;
  };

  const carveOceanFromWest = (state: RowState, y: number, tiles: number): number => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state.west[y];
    const limit = state.east[y];
    const rowOffset = y * width;
    while (removed < tiles && x <= limit) {
      const idx = rowOffset + x;
      if (!landMask || landMask[idx]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x++;
    }
    state.west[y] = clampInt(state.west[y] + removed, 0, limit);
    return removed;
  };

  const fillLandFromWest = (state: RowState, y: number, tiles: number): number => {
    if (!tiles) return 0;
    let added = 0;
    let x = state.west[y] - 1;
    while (added < tiles && x >= 0) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x--;
    }
    state.west[y] = clampInt(state.west[y] - added, 0, width - 1);
    return added;
  };

  const fillLandFromEast = (state: RowState, y: number, tiles: number): number => {
    if (!tiles) return 0;
    let added = 0;
    let x = state.east[y] + 1;
    while (added < tiles && x < width) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x++;
    }
    state.east[y] = clampInt(state.east[y] + added, 0, width - 1);
    return added;
  };

  // Process band pairs
  for (const pair of bandPairs) {
    const li = Array.isArray(pair) ? (pair[0] | 0) : -1;
    const ri = Array.isArray(pair) ? (pair[1] | 0) : -1;
    const left = rowStates[li];
    const right = rowStates[ri];
    if (!left || !right) continue;

    const rowStart = Math.max(0, Math.max(left.south, right.south));
    const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));

    for (let y = rowStart; y <= rowEnd; y++) {
      const mid = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
      const clos = closeness[y * width + mid] | 0;
      let sep = baseSeparation;
      if (sep > 0) {
        const weight = clos / 255;
        sep += Math.round(weight * closenessMultiplier * baseSeparation);
      }
      if (sep > maxPerRow) sep = maxPerRow;
      if (sep <= 0) continue;

      carveOceanFromEast(left, y, sep);
      carveOceanFromWest(right, y, sep);
    }
  }

  // Edge west processing
  const edgeWest = policy.edgeWest || {};
  if (rowStates.length && edgeWest.enabled) {
    const state = rowStates[0];
    const base = (edgeWest.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeWest.boundaryClosenessMultiplier)
      ? edgeWest.boundaryClosenessMultiplier!
      : 1.0;
    const cap = Math.max(0, (edgeWest.maxPerRowDelta ?? 2) | 0);

    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + 0] | 0;
      let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;

      if (base >= 0) {
        carveOceanFromWest(state, y, mag);
      } else {
        fillLandFromWest(state, y, mag);
      }
    }
  }

  // Edge east processing
  const edgeEast = policy.edgeEast || {};
  if (rowStates.length && edgeEast.enabled) {
    const state = rowStates[rowStates.length - 1];
    const base = (edgeEast.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeEast.boundaryClosenessMultiplier)
      ? edgeEast.boundaryClosenessMultiplier!
      : 1.0;
    const cap = Math.max(0, (edgeEast.maxPerRowDelta ?? 2) | 0);

    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + (width - 1)] | 0;
      let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;

      if (base >= 0) {
        carveOceanFromEast(state, y, mag);
      } else {
        fillLandFromEast(state, y, mag);
      }
    }
  }

  const normalized = rowStates.map((state) => aggregateRowState(state, width, height));

  if (ctx && landMask && ctx.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }

  return {
    windows: normalized,
    landMask: landMask ?? undefined,
  };
}

export default {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
};
