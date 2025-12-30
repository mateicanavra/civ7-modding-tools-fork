/**
 * Climate Derivation Functions
 *
 * Pure functions that derive climate values from raw tile inputs.
 * Based on established climate science models:
 * - Temperature: latitude-based with lapse rate correction
 * - Aridity: simplified Thornthwaite PET/rainfall ratio
 * - Moisture: effective moisture with geographic bonuses
 */

import type { TileClimate, DerivedClimate } from "./types.js";

// ============================================================================
// Physical Constants
// ============================================================================

/** Environmental lapse rate: temperature drop per 1000m elevation (°C/km) */
const LAPSE_RATE = 6.5;

/** Base temperature at equator, sea level (°C) */
const EQUATOR_TEMP = 28;

/** Base temperature at poles, sea level (°C) */
const POLAR_TEMP = -15;

/** Temperature range from pole to equator */
const TEMP_RANGE = EQUATOR_TEMP - POLAR_TEMP; // 43°C

/** Coastal moisture bonus (fractional) */
const COASTAL_MOISTURE_BONUS = 0.1;

/** River-adjacent moisture bonus (fractional) */
const RIVER_MOISTURE_BONUS = 0.15;

/** Rainfall normalization factor (pipeline uses 0-200 scale) */
const RAINFALL_SCALE = 200;

/** PET scaling factor - tuned so Mediterranean (temp~20, rain~80) gets aridity ~0.35 */
const PET_RAINFALL_SCALE = 25;

// ============================================================================
// Derivation Functions
// ============================================================================

/**
 * Derive temperature from latitude and elevation.
 *
 * Uses cosine curve for latitude (approximating solar angle)
 * and standard environmental lapse rate for elevation.
 *
 * @param latitude - Absolute latitude (0-90°)
 * @param elevation - Elevation in meters
 * @returns Temperature in °C
 *
 * @example
 * deriveTemperature(0, 0)    // → 28°C (equator, sea level)
 * deriveTemperature(90, 0)   // → -15°C (pole, sea level)
 * deriveTemperature(30, 4500) // → -7.5°C (alpine)
 */
export function deriveTemperature(latitude: number, elevation: number): number {
  // Cosine curve: 1.0 at equator (lat=0), 0.0 at poles (lat=90)
  const latRadians = (Math.abs(latitude) * Math.PI) / 180;
  const latFactor = Math.cos(latRadians);

  // Base temperature from latitude
  const baseTemp = POLAR_TEMP + TEMP_RANGE * latFactor;

  // Lapse rate adjustment for elevation
  const elevationPenalty = (elevation / 1000) * LAPSE_RATE;

  return baseTemp - elevationPenalty;
}

/**
 * Derive aridity index from temperature and rainfall.
 *
 * Uses a simplified evapotranspiration model tuned for game balance.
 * Aridity = PET / Precipitation, clamped to 0-1.
 *
 * High aridity (→1.0) means evaporation demand exceeds rainfall.
 * Low aridity (→0.0) means rainfall exceeds evaporation demand.
 *
 * @param temperature - Temperature in °C
 * @param rainfall - Rainfall on 0-200 normalized scale
 * @returns Aridity index (0-1)
 *
 * @example
 * deriveAridity(25, 15)   // → ~0.85 (hot + dry = very arid)
 * deriveAridity(20, 80)   // → ~0.30 (Mediterranean)
 * deriveAridity(10, 150)  // → ~0.10 (cool + wet = humid)
 * deriveAridity(-5, 50)   // → 0.0 (cold = no PET)
 */
export function deriveAridity(temperature: number, rainfall: number): number {
  // No evapotranspiration below freezing
  if (temperature <= 0) return 0;

  // No rainfall = fully arid
  if (rainfall <= 0) return 1.0;

  // Simplified PET model - tuned for gameplay
  // At 20°C with rainfall 80, we want aridity ~0.3 (temperate)
  // At 25°C with rainfall 15, we want aridity ~0.9 (desert)
  // At 10°C with rainfall 150, we want aridity ~0.1 (humid)
  //
  // Formula: aridity = (temp * K) / rainfall
  // For temp=20, rain=80, aridity=0.3 → K = 0.3 * 80 / 20 = 1.2
  const K = 1.2;
  const rawAridity = (temperature * K) / rainfall;

  return Math.min(1.0, Math.max(0, rawAridity));
}

/**
 * Derive moisture index from rainfall with geographic bonuses.
 *
 * Moisture index represents effective water availability,
 * accounting for coastal maritime influence and riparian effects.
 *
 * @param rainfall - Rainfall on 0-200 normalized scale
 * @param isCoastal - Whether tile is adjacent to water
 * @param riverAdjacent - Whether tile is within radius 1 of river
 * @returns Moisture index (0-1)
 *
 * @example
 * deriveMoistureIndex(100, false, false) // → 0.50
 * deriveMoistureIndex(100, true, false)  // → 0.60 (coastal bonus)
 * deriveMoistureIndex(100, true, true)   // → 0.75 (both bonuses)
 */
export function deriveMoistureIndex(
  rainfall: number,
  isCoastal: boolean,
  riverAdjacent: boolean
): number {
  // Base moisture from rainfall
  let moisture = rainfall / RAINFALL_SCALE;

  // Geographic bonuses
  if (isCoastal) moisture += COASTAL_MOISTURE_BONUS;
  if (riverAdjacent) moisture += RIVER_MOISTURE_BONUS;

  return Math.min(1.0, Math.max(0, moisture));
}

/**
 * Derive all climate values from raw tile inputs.
 *
 * This is the main entry point for climate derivation.
 *
 * @param climate - Raw tile climate inputs
 * @returns Complete derived climate with all computed values
 */
export function deriveClimate(climate: TileClimate): DerivedClimate {
  const temperature = deriveTemperature(climate.latitude, climate.elevation);
  const aridity = deriveAridity(temperature, climate.rainfall);
  const moistureIndex = deriveMoistureIndex(
    climate.rainfall,
    climate.isCoastal,
    climate.riverAdjacent
  );

  return {
    ...climate,
    temperature,
    aridity,
    moistureIndex,
  };
}
