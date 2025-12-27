/**
 * Terrain Constants — Adapter-initialized indices
 *
 * @packageDocumentation
 *
 * CRITICAL: This module provides terrain type indices that match the engine's
 * terrain.xml definitions. The order in terrain.xml is:
 *   0: TERRAIN_MOUNTAIN
 *   1: TERRAIN_HILL
 *   2: TERRAIN_FLAT
 *   3: TERRAIN_COAST
 *   4: TERRAIN_OCEAN
 *   5: TERRAIN_NAVIGABLE_RIVER
 *
 * This differs from common assumptions (e.g., 0=COAST). Always use these
 * constants instead of hardcoding terrain indices.
 */

import type { EngineAdapter } from "@civ7/adapter";

// ============================================================================
// Defaults (used when adapter lookups are unavailable)
// ============================================================================

const DEFAULT_TERRAIN_INDICES = {
  MOUNTAIN: 0,
  HILL: 1,
  FLAT: 2,
  COAST: 3,
  OCEAN: 4,
  NAVIGABLE_RIVER: 5,
} as const;

const DEFAULT_BIOME_INDICES = {
  TUNDRA: 0,
  GRASSLAND: 1,
  PLAINS: 2,
  TROPICAL: 3,
  DESERT: 4,
  MARINE: 5,
} as const;

const DEFAULT_FEATURE_INDICES = {
  VOLCANO: -1,
} as const;

let initializedAdapter: EngineAdapter | null = null;
const terrainFallbackWarnings = new Set<string>();

function warnFallback(label: string, fallback: number, value: number): void {
  if (terrainFallbackWarnings.has(label)) return;
  terrainFallbackWarnings.add(label);
  console.log(
    `[terrain-constants][warn] Using fallback for ${label} (${fallback}). Adapter returned ${value}.`
  );
}

function resolveTerrainIndex(adapter: EngineAdapter, name: string, fallback: number): number {
  const value = adapter.getTerrainTypeIndex(name);
  if (Number.isFinite(value) && value >= 0) return value;
  warnFallback(name, fallback, value);
  return fallback;
}

function resolveBiomeIndex(adapter: EngineAdapter, name: string, fallback: number): number {
  const value = adapter.getBiomeGlobal(name);
  if (Number.isFinite(value) && value >= 0) return value;
  warnFallback(name, fallback, value);
  return fallback;
}

function resolveFeatureIndex(adapter: EngineAdapter, name: string, fallback: number): number {
  const value = adapter.getFeatureTypeIndex(name);
  if (Number.isFinite(value) && value >= 0) return value;
  warnFallback(name, fallback, value);
  return fallback;
}

// ============================================================================
// Adapter Sync
// ============================================================================

export function initializeTerrainConstants(adapter: EngineAdapter): void {
  if (initializedAdapter === adapter) return;
  if (initializedAdapter && initializedAdapter !== adapter) {
    console.log("[terrain-constants][warn] Reinitializing constants for new adapter instance.");
  }
  initializedAdapter = adapter;
  terrainFallbackWarnings.clear();

  MOUNTAIN_TERRAIN = resolveTerrainIndex(adapter, "TERRAIN_MOUNTAIN", DEFAULT_TERRAIN_INDICES.MOUNTAIN);
  HILL_TERRAIN = resolveTerrainIndex(adapter, "TERRAIN_HILL", DEFAULT_TERRAIN_INDICES.HILL);
  FLAT_TERRAIN = resolveTerrainIndex(adapter, "TERRAIN_FLAT", DEFAULT_TERRAIN_INDICES.FLAT);
  COAST_TERRAIN = resolveTerrainIndex(adapter, "TERRAIN_COAST", DEFAULT_TERRAIN_INDICES.COAST);
  OCEAN_TERRAIN = resolveTerrainIndex(adapter, "TERRAIN_OCEAN", DEFAULT_TERRAIN_INDICES.OCEAN);
  NAVIGABLE_RIVER_TERRAIN = resolveTerrainIndex(
    adapter,
    "TERRAIN_NAVIGABLE_RIVER",
    DEFAULT_TERRAIN_INDICES.NAVIGABLE_RIVER
  );

  TUNDRA_BIOME = resolveBiomeIndex(adapter, "tundra", DEFAULT_BIOME_INDICES.TUNDRA);
  GRASSLAND_BIOME = resolveBiomeIndex(adapter, "grassland", DEFAULT_BIOME_INDICES.GRASSLAND);
  PLAINS_BIOME = resolveBiomeIndex(adapter, "plains", DEFAULT_BIOME_INDICES.PLAINS);
  TROPICAL_BIOME = resolveBiomeIndex(adapter, "tropical", DEFAULT_BIOME_INDICES.TROPICAL);
  DESERT_BIOME = resolveBiomeIndex(adapter, "desert", DEFAULT_BIOME_INDICES.DESERT);
  MARINE_BIOME = resolveBiomeIndex(adapter, "marine", DEFAULT_BIOME_INDICES.MARINE);

  VOLCANO_FEATURE = resolveFeatureIndex(adapter, "FEATURE_VOLCANO", DEFAULT_FEATURE_INDICES.VOLCANO);
}

// ============================================================================
// Terrain Type Constants
// ============================================================================
// These default to the canonical terrain.xml order; adapters may override them
// via initializeTerrainConstants().

/** TERRAIN_MOUNTAIN index (default: 0 per terrain.xml) */
export let MOUNTAIN_TERRAIN: number = DEFAULT_TERRAIN_INDICES.MOUNTAIN;

/** TERRAIN_HILL index (default: 1 per terrain.xml) */
export let HILL_TERRAIN: number = DEFAULT_TERRAIN_INDICES.HILL;

/** TERRAIN_FLAT index (default: 2 per terrain.xml) */
export let FLAT_TERRAIN: number = DEFAULT_TERRAIN_INDICES.FLAT;

/** TERRAIN_COAST index (default: 3 per terrain.xml) */
export let COAST_TERRAIN: number = DEFAULT_TERRAIN_INDICES.COAST;

/** TERRAIN_OCEAN index (default: 4 per terrain.xml) */
export let OCEAN_TERRAIN: number = DEFAULT_TERRAIN_INDICES.OCEAN;

/** TERRAIN_NAVIGABLE_RIVER index (default: 5 per terrain.xml) */
export let NAVIGABLE_RIVER_TERRAIN: number = DEFAULT_TERRAIN_INDICES.NAVIGABLE_RIVER;

// ============================================================================
// Biome Type Constants (for completeness)
// ============================================================================

/** BIOME_TUNDRA index */
export let TUNDRA_BIOME: number = DEFAULT_BIOME_INDICES.TUNDRA;

/** BIOME_GRASSLAND index */
export let GRASSLAND_BIOME: number = DEFAULT_BIOME_INDICES.GRASSLAND;

/** BIOME_PLAINS index */
export let PLAINS_BIOME: number = DEFAULT_BIOME_INDICES.PLAINS;

/** BIOME_TROPICAL index */
export let TROPICAL_BIOME: number = DEFAULT_BIOME_INDICES.TROPICAL;

/** BIOME_DESERT index */
export let DESERT_BIOME: number = DEFAULT_BIOME_INDICES.DESERT;

/** BIOME_MARINE index */
export let MARINE_BIOME: number = DEFAULT_BIOME_INDICES.MARINE;

// ============================================================================
// Feature Type Constants
// ============================================================================

/** FEATURE_VOLCANO index */
export let VOLCANO_FEATURE: number = DEFAULT_FEATURE_INDICES.VOLCANO;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a terrain type represents water (coast or ocean).
 */
export function isWaterTerrain(terrain: number): boolean {
  return terrain === COAST_TERRAIN || terrain === OCEAN_TERRAIN;
}

/**
 * Check if a terrain type represents land (mountain, hill, or flat).
 */
export function isLandTerrain(terrain: number): boolean {
  return terrain === MOUNTAIN_TERRAIN || terrain === HILL_TERRAIN || terrain === FLAT_TERRAIN;
}

/**
 * Get terrain name for logging/debugging.
 */
export function getTerrainName(terrain: number): string {
  switch (terrain) {
    case MOUNTAIN_TERRAIN:
      return "MOUNTAIN";
    case HILL_TERRAIN:
      return "HILL";
    case FLAT_TERRAIN:
      return "FLAT";
    case COAST_TERRAIN:
      return "COAST";
    case OCEAN_TERRAIN:
      return "OCEAN";
    case NAVIGABLE_RIVER_TERRAIN:
      return "NAVIGABLE_RIVER";
    default:
      return `UNKNOWN(${terrain})`;
  }
}

/**
 * Get ASCII symbol for terrain type (for map visualization).
 * Uses correct mapping: M=mountain, ^=hill, .=flat, ~=coast, O=ocean
 */
export function getTerrainSymbol(terrain: number): string {
  switch (terrain) {
    case MOUNTAIN_TERRAIN:
      return "M";
    case HILL_TERRAIN:
      return "^";
    case FLAT_TERRAIN:
      return ".";
    case COAST_TERRAIN:
      return "~";
    case OCEAN_TERRAIN:
      return "O";
    case NAVIGABLE_RIVER_TERRAIN:
      return "R";
    default:
      return "?";
  }
}

// ============================================================================
// Fractal Constants (matching map-globals.js)
// ============================================================================

/** Fractal layer for landmass generation */
export const LANDMASS_FRACTAL = 0;

/** Fractal layer for mountain generation */
export const MOUNTAIN_FRACTAL = 1;

/** Fractal layer for hill generation */
export const HILL_FRACTAL = 2;
