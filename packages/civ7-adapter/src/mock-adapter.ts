/**
 * MockAdapter - Test implementation with configurable behavior
 *
 * This module has NO /base-standard/... imports and can be used
 * in unit tests without the Civ7 game engine.
 */

import type { EngineAdapter, FeatureData, MapInfo, MapInitParams, MapSizeId } from "./types.js";

/**
 * Configuration options for MockAdapter
 */
/**
 * Default biome globals for testing
 */
export const DEFAULT_BIOME_GLOBALS: Record<string, number> = {
  desert: 0,
  plains: 1,
  grassland: 2,
  tundra: 3,
  tropical: 4,
  snow: 5,
};

/**
 * Default feature type indices for testing
 */
export const DEFAULT_FEATURE_TYPES: Record<string, number> = {
  FEATURE_REEF: 0,
  FEATURE_RAINFOREST: 1,
  FEATURE_FOREST: 2,
  FEATURE_TAIGA: 3,
  FEATURE_MARSH: 4,
  FEATURE_OASIS: 5,
  FEATURE_FLOODPLAINS: 6,
};

export interface MockAdapterConfig {
  width?: number;
  height?: number;
  /** Map size selection id (Civ7: GameplayMap.getMapSize()) */
  mapSizeId?: MapSizeId;
  /** Map info row (Civ7: GameInfo.Maps.lookup(mapSizeId)) */
  mapInfo?: MapInfo | null;
  /** Default terrain type for all tiles */
  defaultTerrainType?: number;
  /** Default elevation for all tiles */
  defaultElevation?: number;
  /** Default rainfall for all tiles */
  defaultRainfall?: number;
  /** Default temperature for all tiles */
  defaultTemperature?: number;
  /** Default biome type for all tiles */
  defaultBiomeType?: number;
  /** Custom RNG function (default: Math.random) */
  rng?: (max: number, label: string) => number;
  /** Custom biome globals (default: DEFAULT_BIOME_GLOBALS) */
  biomeGlobals?: Record<string, number>;
  /** Custom feature type indices (default: DEFAULT_FEATURE_TYPES) */
  featureTypes?: Record<string, number>;
}

/**
 * Mock adapter for testing map generation logic without Civ7 engine
 */
export class MockAdapter implements EngineAdapter {
  readonly width: number;
  readonly height: number;

  private mapSizeId: MapSizeId;
  private mapInfo: MapInfo | null;

  private terrainTypes: Uint8Array;
  private elevations: Int16Array;
  private rainfall: Uint8Array;
  private temperature: Uint8Array;
  private features: Int16Array;
  private biomes: Uint8Array;
  private waterMask: Uint8Array;
  private mountainMask: Uint8Array;
  private landmassRegionIds: Uint8Array;
  private rngFn: (max: number, label: string) => number;
  private biomeGlobals: Record<string, number>;
  private featureTypes: Record<string, number>;

  /** Track calls for testing */
  readonly calls: {
    setMapInitData: Array<MapInitParams>;
    designateBiomes: Array<{ width: number; height: number }>;
    addFeatures: Array<{ width: number; height: number }>;
    addNaturalWonders: Array<{ width: number; height: number; numWonders: number }>;
    generateSnow: Array<{ width: number; height: number }>;
    generateResources: Array<{ width: number; height: number }>;
    generateLakes: Array<{ width: number; height: number; tilesPerLake: number }>;
    expandCoasts: Array<{ width: number; height: number }>;
    assignStartPositions: Array<{
      playersLandmass1: number;
      playersLandmass2: number;
      startSectorRows: number;
      startSectorCols: number;
    }>;
    generateDiscoveries: Array<{ width: number; height: number; startPositions: number[] }>;
    assignAdvancedStartRegions: number;
    addFloodplains: Array<{ minLength: number; maxLength: number }>;
    recalculateFertility: number;
  };

  constructor(config: MockAdapterConfig = {}) {
    this.width = config.width ?? 128;
    this.height = config.height ?? 80;
    this.mapSizeId = config.mapSizeId ?? 0;
    this.mapInfo = config.mapInfo ?? null;
    const size = this.width * this.height;

    this.terrainTypes = new Uint8Array(size).fill(config.defaultTerrainType ?? 0);
    this.elevations = new Int16Array(size).fill(config.defaultElevation ?? 100);
    this.rainfall = new Uint8Array(size).fill(config.defaultRainfall ?? 50);
    this.temperature = new Uint8Array(size).fill(config.defaultTemperature ?? 15);
    this.features = new Int16Array(size).fill(-1);
    this.biomes = new Uint8Array(size).fill(config.defaultBiomeType ?? 0);
    this.waterMask = new Uint8Array(size);
    this.mountainMask = new Uint8Array(size);
    this.landmassRegionIds = new Uint8Array(size);
    this.rngFn = config.rng ?? ((max) => Math.floor(Math.random() * max));
    this.biomeGlobals = config.biomeGlobals ?? { ...DEFAULT_BIOME_GLOBALS };
    this.featureTypes = config.featureTypes ?? { ...DEFAULT_FEATURE_TYPES };
    this.calls = {
      setMapInitData: [],
      designateBiomes: [],
      addFeatures: [],
      addNaturalWonders: [],
      generateSnow: [],
      generateResources: [],
      generateLakes: [],
      expandCoasts: [],
      assignStartPositions: [],
      generateDiscoveries: [],
      assignAdvancedStartRegions: 0,
      addFloodplains: [],
      recalculateFertility: 0,
    };
  }

  private idx(x: number, y: number): number {
    return y * this.width + x;
  }

  // === MAP INIT / MAP INFO ===

  getMapSizeId(): MapSizeId {
    return this.mapSizeId;
  }

  lookupMapInfo(_mapSizeId: MapSizeId): MapInfo | null {
    return this.mapInfo;
  }

  setMapInitData(params: MapInitParams): void {
    this.calls.setMapInitData.push({ ...params });
  }

  // === TERRAIN READS ===

  isWater(x: number, y: number): boolean {
    return this.waterMask[this.idx(x, y)] === 1;
  }

  isMountain(x: number, y: number): boolean {
    return this.mountainMask[this.idx(x, y)] === 1;
  }

  isAdjacentToRivers(_x: number, _y: number, _radius = 1): boolean {
    return false; // Mock: no rivers by default
  }

  getElevation(x: number, y: number): number {
    return this.elevations[this.idx(x, y)];
  }

  getTerrainType(x: number, y: number): number {
    return this.terrainTypes[this.idx(x, y)];
  }

  getRainfall(x: number, y: number): number {
    return this.rainfall[this.idx(x, y)];
  }

  getTemperature(x: number, y: number): number {
    return this.temperature[this.idx(x, y)];
  }

  getLatitude(x: number, y: number): number {
    // Simple latitude calculation: -90 to 90 based on y position
    const normalizedY = y / this.height;
    return 90 - normalizedY * 180;
  }

  // === TERRAIN WRITES ===

  setTerrainType(x: number, y: number, terrainType: number): void {
    this.terrainTypes[this.idx(x, y)] = terrainType;
  }

  setRainfall(x: number, y: number, value: number): void {
    this.rainfall[this.idx(x, y)] = Math.max(0, Math.min(200, value));
  }

  setLandmassRegionId(x: number, y: number, regionId: number): void {
    this.landmassRegionIds[this.idx(x, y)] = regionId;
  }

  addPlotTag(_x: number, _y: number, _plotTag: number): void {
    // No-op in mock - plot tags are engine-specific
  }

  setPlotTag(_x: number, _y: number, _plotTag: number): void {
    // No-op in mock - plot tags are engine-specific
  }

  // === FEATURE READS/WRITES ===

  getFeatureType(x: number, y: number): number {
    return this.features[this.idx(x, y)];
  }

  setFeatureType(x: number, y: number, featureData: FeatureData): void {
    this.features[this.idx(x, y)] = featureData.Feature;
  }

  canHaveFeature(_x: number, _y: number, _featureType: number): boolean {
    return true; // Mock: always allow features
  }

  // === RANDOM NUMBER GENERATION ===

  getRandomNumber(max: number, label: string): number {
    return this.rngFn(max, label);
  }

  // === UTILITIES ===

  validateAndFixTerrain(): void {
    // No-op in mock
  }

  recalculateAreas(): void {
    // No-op in mock
  }

  createFractal(
    _fractalId: number,
    _width: number,
    _height: number,
    _grain: number,
    _flags: number
  ): void {
    // No-op in mock
  }

  getFractalHeight(_fractalId: number, _x: number, _y: number): number {
    return 0; // Mock: flat fractal
  }

  stampContinents(): void {
    // No-op in mock
  }

  buildElevation(): void {
    // No-op in mock
  }

  modelRivers(_minLength: number, _maxLength: number, _navigableTerrain: number): void {
    // No-op in mock
  }

  defineNamedRivers(): void {
    // No-op in mock
  }

  storeWaterData(): void {
    // No-op in mock
  }

  generateLakes(width: number, height: number, tilesPerLake: number): void {
    this.calls.generateLakes.push({ width, height, tilesPerLake });
    // Mock: no-op
  }

  expandCoasts(width: number, height: number): void {
    this.calls.expandCoasts.push({ width, height });
    // Mock: no-op
  }

  // === BIOMES ===

  designateBiomes(width: number, height: number): void {
    // Track call for testing
    this.calls.designateBiomes.push({ width, height });
    // Mock: no-op (biomes already initialized to default)
  }

  getBiomeGlobal(name: string): number {
    return this.biomeGlobals[name] ?? -1;
  }

  setBiomeType(x: number, y: number, biomeId: number): void {
    this.biomes[this.idx(x, y)] = biomeId;
  }

  getBiomeType(x: number, y: number): number {
    return this.biomes[this.idx(x, y)];
  }

  // === FEATURES (extended) ===

  addFeatures(width: number, height: number): void {
    // Track call for testing
    this.calls.addFeatures.push({ width, height });
    // Mock: no-op (features already initialized to NO_FEATURE)
  }

  getFeatureTypeIndex(name: string): number {
    return this.featureTypes[name] ?? -1;
  }

  get NO_FEATURE(): number {
    return -1;
  }

  // === PLACEMENT ===

  addNaturalWonders(width: number, height: number, numWonders: number): void {
    this.calls.addNaturalWonders.push({ width, height, numWonders });
    // Mock: no-op
  }

  generateSnow(width: number, height: number): void {
    this.calls.generateSnow.push({ width, height });
    // Mock: no-op
  }

  generateResources(width: number, height: number): void {
    this.calls.generateResources.push({ width, height });
    // Mock: no-op
  }

  assignStartPositions(
    playersLandmass1: number,
    playersLandmass2: number,
    _westContinent: { west: number; east: number; south: number; north: number },
    _eastContinent: { west: number; east: number; south: number; north: number },
    startSectorRows: number,
    startSectorCols: number,
    _startSectors: number[]
  ): number[] {
    this.calls.assignStartPositions.push({
      playersLandmass1,
      playersLandmass2,
      startSectorRows,
      startSectorCols,
    });
    // Mock: return array of placeholder positions (one per player)
    const totalPlayers = playersLandmass1 + playersLandmass2;
    return Array.from({ length: totalPlayers }, (_, i) => i * 100);
  }

  generateDiscoveries(width: number, height: number, startPositions: number[]): void {
    this.calls.generateDiscoveries.push({ width, height, startPositions: [...startPositions] });
    // Mock: no-op
  }

  assignAdvancedStartRegions(): void {
    this.calls.assignAdvancedStartRegions++;
    // Mock: no-op
  }

  addFloodplains(minLength: number, maxLength: number): void {
    this.calls.addFloodplains.push({ minLength, maxLength });
    // Mock: no-op
  }

  recalculateFertility(): void {
    this.calls.recalculateFertility++;
    // Mock: no-op
  }

  chooseStartSectors(
    _players1: number,
    _players2: number,
    _rows: number,
    _cols: number,
    _humanNearEquator: boolean
  ): unknown[] {
    // Mock: empty; callers can supply custom behavior if they need it.
    return [];
  }

  needHumanNearEquator(): boolean {
    return false;
  }

  // === MOCK-SPECIFIC HELPERS ===

  /** Set water mask for testing */
  setWater(x: number, y: number, isWater: boolean): void {
    this.waterMask[this.idx(x, y)] = isWater ? 1 : 0;
  }

  /** Set mountain mask for testing */
  setMountain(x: number, y: number, isMountain: boolean): void {
    this.mountainMask[this.idx(x, y)] = isMountain ? 1 : 0;
  }

  /** Fill all tiles with water/land */
  fillWater(isWater: boolean): void {
    this.waterMask.fill(isWater ? 1 : 0);
  }

  /** Reset all data to defaults */
  reset(config: MockAdapterConfig = {}): void {
    this.terrainTypes.fill(config.defaultTerrainType ?? 0);
    this.elevations.fill(config.defaultElevation ?? 100);
    this.rainfall.fill(config.defaultRainfall ?? 50);
    this.temperature.fill(config.defaultTemperature ?? 15);
    this.features.fill(-1);
    this.biomes.fill(config.defaultBiomeType ?? 0);
    this.waterMask.fill(0);
    this.mountainMask.fill(0);
    this.landmassRegionIds.fill(0);
    this.mapSizeId = config.mapSizeId ?? 0;
    this.mapInfo = config.mapInfo ?? null;
    this.calls.setMapInitData.length = 0;
    this.calls.designateBiomes.length = 0;
    this.calls.addFeatures.length = 0;
    this.calls.addNaturalWonders.length = 0;
    this.calls.generateSnow.length = 0;
    this.calls.generateResources.length = 0;
    this.calls.generateLakes.length = 0;
    this.calls.expandCoasts.length = 0;
    this.calls.assignStartPositions.length = 0;
    this.calls.generateDiscoveries.length = 0;
    this.calls.assignAdvancedStartRegions = 0;
    this.calls.addFloodplains.length = 0;
    this.calls.recalculateFertility = 0;
  }

  /** Set biome type for testing */
  setBiome(x: number, y: number, biomeId: number): void {
    this.biomes[this.idx(x, y)] = biomeId;
  }

  /** Fill all tiles with a biome type */
  fillBiome(biomeId: number): void {
    this.biomes.fill(biomeId);
  }

  /** Register a custom biome global */
  registerBiomeGlobal(name: string, index: number): void {
    this.biomeGlobals[name] = index;
  }

  /** Register a custom feature type */
  registerFeatureType(name: string, index: number): void {
    this.featureTypes[name] = index;
  }
}

/**
 * Create a mock adapter with default configuration
 */
export function createMockAdapter(config?: MockAdapterConfig): MockAdapter {
  return new MockAdapter(config);
}
