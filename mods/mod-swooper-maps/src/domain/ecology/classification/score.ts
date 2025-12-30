/**
 * Biome Scoring Functions
 *
 * Each function computes an affinity score (0-1) for a specific biome
 * based on derived climate values. Uses sigmoid and Gaussian curves
 * for smooth transitions between biomes (ecotones).
 *
 * Scoring approach:
 * - Each biome has ideal conditions where it scores highest
 * - Scores decay smoothly as conditions deviate from ideal
 * - Multiple factors are combined via weighted geometric mean
 * - PLAINS has a built-in penalty as a fallback biome
 */

import type { DerivedClimate, BiomeThresholds } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./types.js";

// ============================================================================
// Curve Helpers
// ============================================================================

/**
 * Sigmoid curve for smooth threshold transitions.
 * Returns 0→1 as x increases past center.
 *
 * @param x - Input value
 * @param center - Inflection point (where output = 0.5)
 * @param k - Steepness (higher = sharper transition)
 */
function sigmoid(x: number, center: number, k: number): number {
  return 1 / (1 + Math.exp(-k * (x - center)));
}

/**
 * Inverse sigmoid: high when x is LOW.
 * Returns 1→0 as x increases past center.
 */
function invSigmoid(x: number, center: number, k: number): number {
  return 1 - sigmoid(x, center, k);
}

/**
 * Gaussian curve for band preferences.
 * Returns highest (1.0) at center, decays symmetrically.
 *
 * @param x - Input value
 * @param center - Peak location
 * @param width - Standard deviation (controls decay rate)
 */
function gaussian(x: number, center: number, width: number): number {
  return Math.exp(-Math.pow((x - center) / width, 2));
}

/**
 * Soft minimum - combines scores while allowing one low score to drag down result
 * Less harsh than pure multiplication
 */
function softMin(a: number, b: number, softness: number = 0.3): number {
  return Math.pow(a * b, 0.5 + softness) * Math.pow(Math.min(a, b), 0.5 - softness);
}

// ============================================================================
// Biome Scoring Functions
// ============================================================================

/**
 * Score affinity for SNOW biome.
 *
 * Snow requires extreme cold:
 * - Primary: temperature < -10°C
 * - Bonus: polar latitude (>75°)
 * - Bonus: high elevation (>800m) with subfreezing temps
 *
 * @returns Score 0-1
 */
export function scoreSnow(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, latitude, elevation } = climate;
  const snowTempMax = thresholds.snowTempMax ?? DEFAULT_THRESHOLDS.snowTempMax;

  // Primary: temperature must be very cold
  // Steepness 0.3 = gradual transition around -10°C
  const tempScore = invSigmoid(temperature, snowTempMax, 0.3);

  // Polar bonus: strong affinity above 75° latitude
  const polarBonus = latitude > 75 ? 0.4 * sigmoid(latitude, 80, 0.2) : 0;

  // Alpine bonus: high elevation with cold temps
  const alpineBonus =
    elevation > 800 && temperature < 0
      ? 0.3 * sigmoid(elevation, 900, 0.01)
      : 0;

  return Math.min(1.0, tempScore + polarBonus + alpineBonus);
}

/**
 * Score affinity for TUNDRA biome.
 *
 * Tundra is cold but not frozen:
 * - Primary: temperature band around 0°C (-8 to +8°C)
 * - Required: latitude > 55° (or equivalent alpine)
 * - Penalty: too arid (would be cold desert)
 *
 * @returns Score 0-1
 */
export function scoreTundra(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, latitude, aridity } = climate;
  const tundraTempCenter =
    thresholds.tundraTempCenter ?? DEFAULT_THRESHOLDS.tundraTempCenter;
  const tundraLatMin =
    thresholds.tundraLatMin ?? DEFAULT_THRESHOLDS.tundraLatMin;

  // Temperature band - tundra favors cold but not frozen
  // Centered around 0°C, with good scores from -8 to +8°C
  // Width 12 = broad band for maritime tundra
  const tempScore = gaussian(temperature, tundraTempCenter + 2, 12);

  // Latitude: strong driver. High latitudes get strong tundra affinity
  let latScore: number;
  if (latitude >= 65) {
    latScore = 1.0;
  } else if (latitude >= tundraLatMin) {
    // 55-65°: ramping up
    latScore = 0.6 + 0.4 * ((latitude - tundraLatMin) / 10);
  } else if (latitude >= 50) {
    // 50-55°: weak tundra potential
    latScore = 0.3;
  } else {
    latScore = 0.05; // Minimal at low latitudes
  }

  // Aridity penalty: very arid conditions favor cold desert over tundra
  const moisturePenalty = aridity > 0.7 ? 0.5 : 1.0;

  // Final score - latitude is key differentiator from grassland
  return tempScore * latScore * moisturePenalty;
}

/**
 * Score affinity for DESERT biome.
 *
 * Desert is hot and arid:
 * - Primary: high aridity (>0.6)
 * - Required: low moisture (<0.3)
 * - Preferred: warm temperatures (but cold deserts possible)
 *
 * @returns Score 0-1
 */
export function scoreDesert(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, aridity, moistureIndex } = climate;
  const desertAridityMin =
    thresholds.desertAridityMin ?? DEFAULT_THRESHOLDS.desertAridityMin;

  // Low moisture is the primary driver for desert
  // Below 0.25 moisture is strongly desert-favoring
  const moistureScore = invSigmoid(moistureIndex, 0.25, 8);

  // Aridity boosts the score further
  const aridityBoost = sigmoid(aridity, desertAridityMin, 4);

  // Temperature: deserts are typically warm but cold deserts exist
  // Score ramps from 0.4 at 0°C to near 1.0 at 25°C
  let tempScore: number;
  if (temperature >= 20) {
    tempScore = 1.0;
  } else if (temperature >= 0) {
    tempScore = 0.4 + 0.6 * sigmoid(temperature, 10, 0.15);
  } else {
    tempScore = 0.35; // Cold deserts still possible
  }

  // Combine: moisture is gate, aridity and temp are boosters
  return moistureScore * (0.5 + 0.25 * aridityBoost + 0.25 * tempScore);
}

/**
 * Score affinity for TROPICAL biome.
 *
 * Tropical is hot, wet, and equatorial:
 * - Primary: high temperature (>22°C)
 * - Required: high moisture (>0.5)
 * - Required: low latitude (<25°)
 *
 * @returns Score 0-1
 */
export function scoreTropical(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, latitude, moistureIndex } = climate;
  const tropicalTempMin =
    thresholds.tropicalTempMin ?? DEFAULT_THRESHOLDS.tropicalTempMin;
  const tropicalLatMax =
    thresholds.tropicalLatMax ?? DEFAULT_THRESHOLDS.tropicalLatMax;

  // Temperature: must be warm (>20°C strongly favored)
  const tempScore = sigmoid(temperature, tropicalTempMin - 2, 0.4);

  // Moisture: must be wet (>0.5)
  const moistureScore = sigmoid(moistureIndex, 0.5, 5);

  // Latitude: strongly favors equatorial, but extends to ~30° with moisture
  let latScore: number;
  if (latitude <= tropicalLatMax) {
    latScore = 1.0;
  } else if (latitude <= 30) {
    // Gradual decay from 20-30°
    latScore = 1.0 - (latitude - tropicalLatMax) / 20;
  } else {
    latScore = 0.1; // Very low at high latitudes
  }

  // Combine with geometric mean for balanced weighting
  return Math.pow(tempScore * moistureScore * latScore, 0.7);
}

/**
 * Score affinity for GRASSLAND biome.
 *
 * Grassland is temperate with good moisture:
 * - Primary: moderate temperature (5-22°C)
 * - Required: good moisture (>0.4)
 * - Penalty: too arid
 *
 * @returns Score 0-1
 */
export function scoreGrassland(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, aridity, moistureIndex } = climate;
  const grasslandMoistureMin =
    thresholds.grasslandMoistureMin ?? DEFAULT_THRESHOLDS.grasslandMoistureMin;

  // Temperature band centered at 14°C, wide range 5-25°C
  // Width 12 = spans roughly 2-26°C at half-max
  const tempScore = gaussian(temperature, 14, 12);

  // Moisture: moderate to high required (>0.4)
  const moistureScore = sigmoid(moistureIndex, grasslandMoistureMin - 0.05, 4);

  // Aridity penalty: grassland needs effective moisture
  let aridityPenalty: number;
  if (aridity < 0.4) {
    aridityPenalty = 1.0;
  } else if (aridity < 0.6) {
    aridityPenalty = 1.0 - (aridity - 0.4) * 1.5; // Linear decay
  } else {
    aridityPenalty = 0.1;
  }

  // Boost for good conditions
  const baseScore = tempScore * moistureScore * aridityPenalty;
  return Math.min(1.0, baseScore * 1.2); // Slight boost to compete with plains
}

/**
 * Score affinity for PLAINS biome.
 *
 * Plains is the drier temperate biome and transitional zone:
 * - Primary: broad temperature tolerance (0-25°C)
 * - Preferred: moderate moisture (0.2-0.45) - drier than grassland
 * - Tolerates: some aridity
 * - Explicitly yields to grassland when moisture is high
 *
 * @returns Score 0-1
 */
export function scorePlains(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): number {
  const { temperature, aridity, moistureIndex } = climate;
  const plainsMoistureCenter =
    thresholds.plainsMoistureCenter ?? DEFAULT_THRESHOLDS.plainsMoistureCenter;

  // Broad temperature band centered at 15°C
  // Width 15 = very tolerant, spans roughly 0-30°C
  const tempScore = gaussian(temperature, 15, 15);

  // Moisture: plains prefers DRIER conditions (0.2-0.4)
  // Falls off sharply above 0.45 to yield to grassland
  let moistureScore: number;
  if (moistureIndex < 0.15) {
    // Too dry even for plains (desert territory)
    moistureScore = 0.4 + moistureIndex * 2;
  } else if (moistureIndex <= 0.4) {
    // Sweet spot for plains - drier temperate
    moistureScore = 0.8 + 0.2 * gaussian(moistureIndex, plainsMoistureCenter, 0.12);
  } else if (moistureIndex <= 0.55) {
    // Transition zone - declining as moisture increases
    moistureScore = 0.7 - (moistureIndex - 0.4) * 2;
  } else {
    // Wet areas strongly favor grassland
    moistureScore = 0.3;
  }

  // Tolerates moderate aridity better than grassland
  let aridityScore: number;
  if (aridity < 0.5) {
    aridityScore = 1.0;
  } else if (aridity < 0.7) {
    aridityScore = 0.85;
  } else {
    aridityScore = 0.5; // Still viable in semi-arid
  }

  return tempScore * moistureScore * aridityScore;
}
