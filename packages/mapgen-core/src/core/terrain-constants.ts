/**
 * Terrain Constants — Dynamic lookup from GameInfo
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

/// <reference types="@civ7/types" />

// ============================================================================
// Dynamic Terrain Lookups (matches official map-globals.js pattern)
// ============================================================================

/**
 * Get terrain index by type name from GameInfo.
 * Returns undefined if not found (for graceful fallback).
 */
function lookupTerrain(terrainType: string): number | undefined {
  try {
    const entry = GameInfo.Terrains.find((t) => t.TerrainType === terrainType);
    return entry?.$index;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Terrain Type Constants
// ============================================================================
// These use dynamic lookup at module load time, with fallback to correct
// hardcoded values from terrain.xml for safety.

/** TERRAIN_MOUNTAIN index (default: 0 per terrain.xml) */
export const MOUNTAIN_TERRAIN: number = lookupTerrain("TERRAIN_MOUNTAIN") ?? 0;

/** TERRAIN_HILL index (default: 1 per terrain.xml) */
export const HILL_TERRAIN: number = lookupTerrain("TERRAIN_HILL") ?? 1;

/** TERRAIN_FLAT index (default: 2 per terrain.xml) */
export const FLAT_TERRAIN: number = lookupTerrain("TERRAIN_FLAT") ?? 2;

/** TERRAIN_COAST index (default: 3 per terrain.xml) */
export const COAST_TERRAIN: number = lookupTerrain("TERRAIN_COAST") ?? 3;

/** TERRAIN_OCEAN index (default: 4 per terrain.xml) */
export const OCEAN_TERRAIN: number = lookupTerrain("TERRAIN_OCEAN") ?? 4;

/** TERRAIN_NAVIGABLE_RIVER index (default: 5 per terrain.xml) */
export const NAVIGABLE_RIVER_TERRAIN: number = lookupTerrain("TERRAIN_NAVIGABLE_RIVER") ?? 5;

// ============================================================================
// Biome Type Constants (for completeness, matching map-globals.js)
// ============================================================================

function lookupBiome(biomeType: string): number | undefined {
  try {
    const entry = GameInfo.Biomes.find((t) => t.BiomeType === biomeType);
    return entry?.$index;
  } catch {
    return undefined;
  }
}

/** BIOME_TUNDRA index */
export const TUNDRA_BIOME: number = lookupBiome("BIOME_TUNDRA") ?? 0;

/** BIOME_GRASSLAND index */
export const GRASSLAND_BIOME: number = lookupBiome("BIOME_GRASSLAND") ?? 1;

/** BIOME_PLAINS index */
export const PLAINS_BIOME: number = lookupBiome("BIOME_PLAINS") ?? 2;

/** BIOME_TROPICAL index */
export const TROPICAL_BIOME: number = lookupBiome("BIOME_TROPICAL") ?? 3;

/** BIOME_DESERT index */
export const DESERT_BIOME: number = lookupBiome("BIOME_DESERT") ?? 4;

/** BIOME_MARINE index */
export const MARINE_BIOME: number = lookupBiome("BIOME_MARINE") ?? 5;

// ============================================================================
// Feature Type Constants
// ============================================================================

function lookupFeature(featureType: string): number | undefined {
  try {
    const entry = GameInfo.Features.find((t) => t.FeatureType === featureType);
    return entry?.$index;
  } catch {
    return undefined;
  }
}

/** FEATURE_VOLCANO index */
export const VOLCANO_FEATURE: number = lookupFeature("FEATURE_VOLCANO") ?? -1;

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
