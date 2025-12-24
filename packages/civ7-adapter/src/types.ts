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
 * Map initialization parameters for Civ7's `SetMapInitData` engine call.
 *
 * These values establish the grid + latitude bounds for map generation.
 */
export interface MapInitParams {
  width: number;
  height: number;
  topLatitude?: number;
  bottomLatitude?: number;
  wrapX?: boolean;
  wrapY?: boolean;
}

/**
 * Map size selection key as returned by Civ7's `GameplayMap.getMapSize()`.
 *
 * Civ7 type declarations currently surface this as a `string`, but some codepaths
 * treat it as a numeric ID. For adapter extensibility, the boundary accepts both.
 */
export type MapSizeId = string | number;

/**
 * Map info row returned by Civ7's `GameInfo.Maps.lookup(mapSizeId)`.
 *
 * Note: Civ7 fields are PascalCase; values may be missing in tests and should be
 * treated as optional by consumers.
 */
export interface MapInfo {
  // === Map Size Dimensions ===
  GridWidth?: number;
  GridHeight?: number;
  MinLatitude?: number;
  MaxLatitude?: number;
  // === Game Setup Parameters ===
  NumNaturalWonders?: number;
  LakeGenerationFrequency?: number;
  PlayersLandmass1?: number;
  PlayersLandmass2?: number;
  StartSectorRows?: number;
  StartSectorCols?: number;
  [key: string]: unknown;
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

  // === MAP INIT / MAP INFO ===

  /**
   * Get the current map size selection ID (Civ7: `GameplayMap.getMapSize()`).
   *
   * For non-Civ7 adapters, this can return a stable sentinel.
   */
  getMapSizeId(): MapSizeId;

  /**
   * Lookup the Civ7 map info row for the given `mapSizeId`
   * (Civ7: `GameInfo.Maps.lookup(mapSizeId)`).
   */
  lookupMapInfo(mapSizeId: MapSizeId): MapInfo | null;

  /**
   * Apply map initialization parameters (Civ7: `engine.call("SetMapInitData", ...)`).
   */
  setMapInitData(params: MapInitParams): void;

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

  /** Set landmass region ID for start position filtering */
  setLandmassRegionId(x: number, y: number, regionId: number): void;

  /** Add a plot tag to a tile (used for start position filtering) */
  addPlotTag(x: number, y: number, plotTag: number): void;

  /** Set plot tag (replaces existing tags) */
  setPlotTag(x: number, y: number, plotTag: number): void;

  // === FEATURE READS/WRITES ===

  /** Get feature type ID */
  getFeatureType(x: number, y: number): number;

  /** Set feature */
  setFeatureType(x: number, y: number, featureData: FeatureData): void;

  /** Validate feature placement */
  canHaveFeature(x: number, y: number, featureType: number): boolean;

  // === EFFECT VERIFICATION ===

  /**
   * Verify that an engine-surface effect has been applied.
   * Used for effect:* postcondition checks (best-effort, adapter-owned).
   */
  verifyEffect(effectId: string): boolean;

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

  /** Generate lakes (wraps Civ7 base-standard elevation terrain generator) */
  generateLakes(width: number, height: number, tilesPerLake: number): void;

  /** Expand coasts (wraps Civ7 base-standard elevation terrain generator) */
  expandCoasts(width: number, height: number): void;

  // === BIOMES ===

  /**
   * Run base-standard biome designation
   * Wraps /base-standard/maps/biomes.js designateBiomes()
   */
  designateBiomes(width: number, height: number): void;

  /**
   * Get biome global index by name
   * @param name - Biome name (e.g., "tropical", "grassland", "tundra")
   * @returns Biome index or -1 if not found
   */
  getBiomeGlobal(name: string): number;

  /**
   * Set biome type for a tile
   */
  setBiomeType(x: number, y: number, biomeId: number): void;

  /**
   * Get biome type for a tile
   */
  getBiomeType(x: number, y: number): number;

  // === FEATURES (extended) ===

  /**
   * Run base-standard feature generation
   * Wraps /base-standard/maps/features.js addFeatures()
   */
  addFeatures(width: number, height: number): void;

  /**
   * Get feature type index by name
   * @param name - Feature type name (e.g., "FEATURE_REEF", "FEATURE_FOREST")
   * @returns Feature index or -1 if not found
   */
  getFeatureTypeIndex(name: string): number;

  /**
   * Sentinel value for "no feature"
   */
  readonly NO_FEATURE: number;

  // === PLACEMENT ===

  /**
   * Add natural wonders to the map
   * Wraps /base-standard/maps/natural-wonder-generator.js addNaturalWonders()
   */
  addNaturalWonders(width: number, height: number, numWonders: number): void;

  /**
   * Generate snow terrain
   * Wraps /base-standard/maps/snow-generator.js generateSnow()
   */
  generateSnow(width: number, height: number): void;

  /**
   * Generate resources on the map
   * Wraps /base-standard/maps/resource-generator.js generateResources()
   */
  generateResources(width: number, height: number): void;

  /**
   * Assign starting positions for players
   * Wraps /base-standard/maps/assign-starting-plots.js assignStartPositions()
   */
  assignStartPositions(
    playersLandmass1: number,
    playersLandmass2: number,
    westContinent: ContinentBounds,
    eastContinent: ContinentBounds,
    startSectorRows: number,
    startSectorCols: number,
    startSectors: number[]
  ): number[];

  /**
   * Generate discoveries on the map (post-starts)
   * Wraps /base-standard/maps/discovery-generator.js generateDiscoveries()
   */
  generateDiscoveries(width: number, height: number, startPositions: number[]): void;

  /**
   * Assign advanced start regions
   * Wraps /base-standard/maps/assign-advanced-start-region.js assignAdvancedStartRegions()
   */
  assignAdvancedStartRegions(): void;

  /**
   * Add floodplains to rivers
   * Wraps TerrainBuilder.addFloodplains()
   */
  addFloodplains(minLength: number, maxLength: number): void;

  /**
   * Recalculate fertility values
   * Wraps FertilityBuilder.recalculate()
   */
  recalculateFertility(): void;

  /**
   * Choose start sectors for players
   * Wraps /base-standard/maps/assign-starting-plots.js chooseStartSectors()
   */
  chooseStartSectors(
    players1: number,
    players2: number,
    rows: number,
    cols: number,
    humanNearEquator: boolean
  ): unknown[];

  /**
   * Check if human player should start near equator
   * Wraps /base-standard/maps/map-utilities.js needHumanNearEquator()
   */
  needHumanNearEquator(): boolean;
}

/**
 * Continent bounds for start placement
 * Compatible with mapgen-core ContinentBounds
 */
export interface ContinentBounds {
  west: number;
  east: number;
  south: number;
  north: number;
  continent?: number;
}

/**
 * Map context for passing state between generation stages
 */
export interface MapContext {
  dimensions: MapDimensions;
  adapter: EngineAdapter;
  config: Record<string, unknown>;
}
