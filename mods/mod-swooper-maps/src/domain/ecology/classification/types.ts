/**
 * Biome Classification Types
 *
 * Core type definitions for the owned biome classification model.
 * These types represent the climate→biome mapping without any engine dependencies.
 */

/**
 * Civ7 biome identifiers.
 * Values match engine indices for direct setBiomeType compatibility.
 */
export enum BiomeId {
  GRASSLAND = 0,
  PLAINS = 1,
  DESERT = 2,
  TUNDRA = 3,
  TROPICAL = 4,
  SNOW = 5,
  MARINE = 6,
}

/**
 * Raw climate inputs from pipeline artifacts.
 * These are the direct observations available per tile.
 */
export interface TileClimate {
  /** Absolute latitude in degrees (0-90) */
  latitude: number;
  /** Elevation in meters */
  elevation: number;
  /** Normalized rainfall (0-200 scale from climateField) */
  rainfall: number;
  /** Whether tile is adjacent to water */
  isCoastal: boolean;
  /** Whether tile is within radius 1 of a river */
  riverAdjacent: boolean;
}

/**
 * Derived climate values computed from raw inputs.
 * These are the values used for biome scoring.
 */
export interface DerivedClimate extends TileClimate {
  /** Derived temperature in °C (from latitude + lapse rate) */
  temperature: number;
  /** Aridity index 0-1 (PET/rainfall proxy; 1 = fully arid) */
  aridity: number;
  /** Moisture index 0-1 (effective moisture with coastal/river bonuses) */
  moistureIndex: number;
}

/**
 * Configurable threshold centers for biome scoring.
 * These control where biome transitions occur in climate space.
 * Steepness of transitions is internal to scoring functions.
 */
export interface BiomeThresholds {
  /** Temperature below which snow affinity rises (default: -10°C) */
  snowTempMax?: number;
  /** Temperature center for tundra affinity (default: -2°C) */
  tundraTempCenter?: number;
  /** Minimum latitude for tundra bonus (default: 55°) */
  tundraLatMin?: number;
  /** Aridity above which desert affinity rises (default: 0.6) */
  desertAridityMin?: number;
  /** Temperature above which tropical affinity rises (default: 22°C) */
  tropicalTempMin?: number;
  /** Maximum latitude for tropical affinity (default: 20°) */
  tropicalLatMax?: number;
  /** Moisture above which grassland affinity rises (default: 0.45) */
  grasslandMoistureMin?: number;
  /** Moisture center for plains affinity band (default: 0.35) */
  plainsMoistureCenter?: number;
}

/**
 * Biome affinity score for ranking.
 */
export interface BiomeAffinity {
  biome: BiomeId;
  score: number;
}

/**
 * Default threshold values.
 * Based on Holdridge life zone model adapted for Civ7.
 */
export const DEFAULT_THRESHOLDS: Required<BiomeThresholds> = {
  snowTempMax: -10,
  tundraTempCenter: -2,
  tundraLatMin: 55,
  desertAridityMin: 0.6,
  tropicalTempMin: 22,
  tropicalLatMax: 20,
  grasslandMoistureMin: 0.45,
  plainsMoistureCenter: 0.35,
};
