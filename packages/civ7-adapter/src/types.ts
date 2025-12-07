/**
 * @civ7/adapter - Type definitions for the engine adapter interface
 *
 * The EngineAdapter interface abstracts all engine/surface interactions.
 * Core logic consumes this interface; tests can mock it.
 */

/// <reference types="@civ7/types" />

/**
 * Feature placement data
 */
export interface FeatureData {
  Feature: number;
  Direction: number;
  Elevation: number;
}

/**
 * Map dimensions
 */
export interface MapDimensions {
  width: number;
  height: number;
}

/**
 * EngineAdapter - abstraction for all engine/surface interactions
 *
 * All terrain/feature reads and writes MUST go through this interface.
 * Implementations:
 * - Civ7Adapter: uses GameplayMap, TerrainBuilder, etc. (production)
 * - MockAdapter: configurable mock for testing (no engine dependencies)
 */
export interface EngineAdapter {
  /** Map width */
  readonly width: number;
  /** Map height */
  readonly height: number;

  // === TERRAIN READS ===

  /** Check if tile is water */
  isWater(x: number, y: number): boolean;

  /** Check if tile is mountain */
  isMountain(x: number, y: number): boolean;

  /** Check if tile is near rivers */
  isAdjacentToRivers(x: number, y: number, radius?: number): boolean;

  /** Get tile elevation */
  getElevation(x: number, y: number): number;

  /** Get terrain type ID */
  getTerrainType(x: number, y: number): number;

  /** Get rainfall (0..200) */
  getRainfall(x: number, y: number): number;

  /** Get temperature */
  getTemperature(x: number, y: number): number;

  /** Get latitude in degrees */
  getLatitude(x: number, y: number): number;

  // === TERRAIN WRITES ===

  /** Set terrain type */
  setTerrainType(x: number, y: number, terrainType: number): void;

  /** Set rainfall (0..200) */
  setRainfall(x: number, y: number, rainfall: number): void;

  /** Set elevation */
  setElevation(x: number, y: number, elevation: number): void;

  // === FEATURE READS/WRITES ===

  /** Get feature type ID */
  getFeatureType(x: number, y: number): number;

  /** Set feature */
  setFeatureType(x: number, y: number, featureData: FeatureData): void;

  /** Validate feature placement */
  canHaveFeature(x: number, y: number, featureType: number): boolean;

  // === RANDOM NUMBER GENERATION ===

  /** Seeded RNG (0..max-1) */
  getRandomNumber(max: number, label: string): number;

  // === UTILITIES ===

  /** Run engine validation pass */
  validateAndFixTerrain(): void;

  /** Rebuild continent/area data */
  recalculateAreas(): void;

  /** Initialize fractal */
  createFractal(
    fractalId: number,
    width: number,
    height: number,
    grain: number,
    flags: number
  ): void;

  /** Sample fractal value */
  getFractalHeight(fractalId: number, x: number, y: number): number;

  /** Stamp continent assignments */
  stampContinents(): void;

  /** Build elevation layer */
  buildElevation(): void;

  /** Model river paths */
  modelRivers(minLength: number, maxLength: number, navigableTerrain: number): void;

  /** Define named rivers */
  defineNamedRivers(): void;

  /** Store water data */
  storeWaterData(): void;
}

/**
 * Map context for passing state between generation stages
 */
export interface MapContext {
  dimensions: MapDimensions;
  adapter: EngineAdapter;
  config: Record<string, unknown>;
}
