/**
 * MockAdapter - Test implementation with configurable behavior
 *
 * This module has NO /base-standard/... imports and can be used
 * in unit tests without the Civ7 game engine.
 */

import type {
  EngineAdapter,
  FeatureData,
  LandmassIdName,
  MapInfo,
  MapInitParams,
  MapSizeId,
  PlotTagName,
  VoronoiBoundingBox,
  VoronoiCell,
  VoronoiDiagram,
  VoronoiPoint2D,
  VoronoiSite,
  VoronoiUtils,
} from "./types.js";
import { ENGINE_EFFECT_TAGS } from "./effects.js";

const DEFAULT_VORONOI_UTILS: VoronoiUtils = {
  createRandomSites(count: number, width: number, height: number): VoronoiSite[] {
    const sites: VoronoiSite[] = [];
    for (let id = 0; id < count; id++) {
      const seed1 = (id * 1664525 + 1013904223) >>> 0;
      const seed2 = (seed1 * 1664525 + 1013904223) >>> 0;
      const x = (seed1 % 10000) / 10000 * width;
      const y = (seed2 % 10000) / 10000 * height;
      sites.push({ x, y, voronoiId: id });
    }
    return sites;
  },

  computeVoronoi(
    sites: VoronoiSite[],
    _bbox: VoronoiBoundingBox,
    relaxationSteps = 0
  ): VoronoiDiagram {
    let currentSites = [...sites];

    for (let step = 0; step < relaxationSteps; step++) {
      currentSites = currentSites.map((site, i) => ({
        ...site,
        voronoiId: i,
      }));
    }

    const cells: VoronoiCell[] = currentSites.map((site) => ({
      site,
      halfedges: [],
    }));

    return { cells, edges: [], vertices: [] };
  },

  calculateCellArea(_cell: VoronoiCell): number {
    return 100;
  },

  normalize(v: VoronoiPoint2D): VoronoiPoint2D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },
};

/**
 * Configuration options for MockAdapter
 */
/**
 * Default biome globals for testing
 */
export const DEFAULT_BIOME_GLOBALS: Record<string, number> = {
  BIOME_TUNDRA: 0,
  BIOME_GRASSLAND: 1,
  BIOME_PLAINS: 2,
  BIOME_TROPICAL: 3,
  BIOME_DESERT: 4,
  BIOME_MARINE: 5,
};

/**
 * Default feature type indices for testing
 */
export const DEFAULT_FEATURE_TYPES: Record<string, number> = {
  FEATURE_SAGEBRUSH_STEPPE: 0,
  FEATURE_OASIS: 1,
  FEATURE_DESERT_FLOODPLAIN_MINOR: 2,
  FEATURE_DESERT_FLOODPLAIN_NAVIGABLE: 3,
  FEATURE_FOREST: 4,
  FEATURE_MARSH: 5,
  FEATURE_GRASSLAND_FLOODPLAIN_MINOR: 6,
  FEATURE_GRASSLAND_FLOODPLAIN_NAVIGABLE: 7,
  FEATURE_REEF: 8,
  FEATURE_COLD_REEF: 9,
  FEATURE_ICE: 10,
  FEATURE_SAVANNA_WOODLAND: 11,
  FEATURE_WATERING_HOLE: 12,
  FEATURE_PLAINS_FLOODPLAIN_MINOR: 13,
  FEATURE_PLAINS_FLOODPLAIN_NAVIGABLE: 14,
  FEATURE_RAINFOREST: 15,
  FEATURE_MANGROVE: 16,
  FEATURE_TROPICAL_FLOODPLAIN_MINOR: 17,
  FEATURE_TROPICAL_FLOODPLAIN_NAVIGABLE: 18,
  FEATURE_TAIGA: 19,
  FEATURE_TUNDRA_BOG: 20,
  FEATURE_TUNDRA_FLOODPLAIN_MINOR: 21,
  FEATURE_TUNDRA_FLOODPLAIN_NAVIGABLE: 22,
  FEATURE_VOLCANO: 23,
  FEATURE_LOTUS: 24,
  FEATURE_ATOLL: 25,
  FEATURE_VALLEY_OF_FLOWERS: 26,
  FEATURE_BARRIER_REEF: 27,
  FEATURE_REDWOOD_FOREST: 28,
  FEATURE_GRAND_CANYON: 29,
  FEATURE_GULLFOSS: 30,
  FEATURE_HOERIKWAGGO: 31,
  FEATURE_IGUAZU_FALLS: 32,
  FEATURE_KILIMANJARO: 33,
  FEATURE_ZHANGJIAJIE: 34,
  FEATURE_THERA: 35,
  FEATURE_TORRES_DEL_PAINE: 36,
  FEATURE_ULURU: 37,
  FEATURE_BERMUDA_TRIANGLE: 38,
  FEATURE_MOUNT_EVEREST: 39,
};

/**
 * Default terrain type indices for testing
 */
export const DEFAULT_TERRAIN_TYPE_INDICES: Record<string, number> = {
  TERRAIN_MOUNTAIN: 0,
  TERRAIN_HILL: 1,
  TERRAIN_FLAT: 2,
  TERRAIN_COAST: 3,
  TERRAIN_OCEAN: 4,
  TERRAIN_NAVIGABLE_RIVER: 5,
};

/**
 * Default plot tag values for testing
 */
export const DEFAULT_PLOT_TAGS: Record<PlotTagName, number> = {
  NONE: 0,
  LANDMASS: 1,
  WATER: 2,
  EAST_LANDMASS: 3,
  WEST_LANDMASS: 4,
  EAST_WATER: 5,
  WEST_WATER: 6,
  ISLAND: 7,
};

/**
 * Default landmass region values for testing
 */
export const DEFAULT_LANDMASS_IDS: Record<LandmassIdName, number> = {
  NONE: 0,
  WEST: 2,
  EAST: 1,
  DEFAULT: 0,
  ANY: -1,
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
  /** Custom terrain type indices (default: DEFAULT_TERRAIN_TYPE_INDICES) */
  terrainTypeIndices?: Record<string, number>;
  /** Custom plot tag values (default: DEFAULT_PLOT_TAGS) */
  plotTags?: Partial<Record<PlotTagName, number>>;
  /** Custom landmass region values (default: DEFAULT_LANDMASS_IDS) */
  landmassIds?: Partial<Record<LandmassIdName, number>>;
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
  private riverMask: Uint8Array;
  private rngFn: (max: number, label: string) => number;
  private biomeGlobals: Record<string, number>;
  private featureTypes: Record<string, number>;
  private terrainTypeIndices: Record<string, number>;
  private plotTags: Record<PlotTagName, number>;
  private landmassIds: Record<LandmassIdName, number>;
  private readonly effectEvidence = new Set<string>();
  private coastTerrainId: number;
  private oceanTerrainId: number;
  private mountainTerrainId: number;

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
    this.riverMask = new Uint8Array(size);
    this.landmassRegionIds = new Uint8Array(size);
    this.rngFn = config.rng ?? ((max) => Math.floor(Math.random() * max));
    this.biomeGlobals = config.biomeGlobals ?? { ...DEFAULT_BIOME_GLOBALS };
    this.featureTypes = config.featureTypes ?? { ...DEFAULT_FEATURE_TYPES };
    this.terrainTypeIndices = config.terrainTypeIndices ?? { ...DEFAULT_TERRAIN_TYPE_INDICES };
    this.plotTags = { ...DEFAULT_PLOT_TAGS, ...(config.plotTags ?? {}) };
    this.landmassIds = { ...DEFAULT_LANDMASS_IDS, ...(config.landmassIds ?? {}) };

    this.coastTerrainId = this.getTerrainTypeIndex("TERRAIN_COAST");
    this.oceanTerrainId = this.getTerrainTypeIndex("TERRAIN_OCEAN");
    this.mountainTerrainId = this.getTerrainTypeIndex("TERRAIN_MOUNTAIN");
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

  private recordEffect(effectId: string): void {
    this.effectEvidence.add(effectId);
  }

  private recordPlacementEffect(): void {
    this.recordEffect(ENGINE_EFFECT_TAGS.placementApplied);
  }

  verifyEffect(effectId: string): boolean {
    if (effectId === "effect:engine.landmassApplied") {
      // Best-effort: landmass should create at least some land and some water.
      let hasLand = false;
      let hasWater = false;
      const size = this.width * this.height;
      for (let i = 0; i < size; i++) {
        const isWater =
          this.waterMask[i] === 1 ||
          this.terrainTypes[i] === this.coastTerrainId ||
          this.terrainTypes[i] === this.oceanTerrainId;
        if (isWater) hasWater = true;
        else hasLand = true;
        if (hasLand && hasWater) return true;
      }
      return false;
    }

    if (effectId === "effect:engine.coastlinesApplied") {
      const size = this.width * this.height;
      for (let i = 0; i < size; i++) {
        if (this.terrainTypes[i] === this.coastTerrainId) return true;
      }
      return false;
    }

    if (effectId === "effect:engine.riversModeled") {
      const size = this.width * this.height;
      for (let i = 0; i < size; i++) {
        if (this.riverMask[i] === 1) return true;
      }
      return false;
    }

    return this.effectEvidence.has(effectId);
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
    const i = this.idx(x, y);
    if (this.waterMask[i] === 1) return true;
    const terrain = this.terrainTypes[i];
    return terrain === this.coastTerrainId || terrain === this.oceanTerrainId;
  }

  isMountain(x: number, y: number): boolean {
    const i = this.idx(x, y);
    if (this.mountainMask[i] === 1) return true;
    return this.terrainTypes[i] === this.mountainTerrainId;
  }

  isAdjacentToRivers(x: number, y: number, radius = 1): boolean {
    const r = Math.max(0, radius | 0);
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= this.height) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= this.width) continue;
        if (this.riverMask[this.idx(nx, ny)] === 1) return true;
      }
    }
    return false;
  }

  getElevation(x: number, y: number): number {
    return this.elevations[this.idx(x, y)];
  }

  getTerrainType(x: number, y: number): number {
    return this.terrainTypes[this.idx(x, y)];
  }

  getTerrainTypeIndex(name: string): number {
    return this.terrainTypeIndices[name] ?? -1;
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

  setLandmassId(x: number, y: number, regionId: number): void {
    this.setLandmassRegionId(x, y, regionId);
  }

  addPlotTag(_x: number, _y: number, _plotTag: number): void {
    // No-op in mock - plot tags are engine-specific
  }

  setPlotTag(_x: number, _y: number, _plotTag: number): void {
    // No-op in mock - plot tags are engine-specific
  }

  getPlotTagId(name: PlotTagName): number {
    return this.plotTags[name] ?? -1;
  }

  getLandmassId(name: LandmassIdName): number {
    return this.landmassIds[name] ?? -1;
  }

  // === FEATURE READS/WRITES ===

  getFeatureType(x: number, y: number): number {
    return this.features[this.idx(x, y)];
  }

  setFeatureType(x: number, y: number, featureData: FeatureData): void {
    this.features[this.idx(x, y)] = featureData.Feature;
    this.recordEffect(ENGINE_EFFECT_TAGS.featuresApplied);
  }

  canHaveFeature(_x: number, _y: number, _featureType: number): boolean {
    return true; // Mock: always allow features
  }

  // === RANDOM NUMBER GENERATION ===

  getRandomNumber(max: number, label: string): number {
    return this.rngFn(max, label);
  }

  // === UTILITIES ===

  getVoronoiUtils(): VoronoiUtils {
    return DEFAULT_VORONOI_UTILS;
  }

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
    this.riverMask.fill(0);

    // Best-effort: ensure at least one river exists on land for effect verification.
    let startX = -1;
    let startY = -1;
    for (let y = 0; y < this.height && startX < 0; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isWater(x, y)) {
          startX = x;
          startY = y;
          break;
        }
      }
    }

    if (startX < 0) return;

    const maxLen = Math.max(1, Math.min(this.height - startY, (_maxLength | 0) || this.height));
    const minLen = Math.max(1, (_minLength | 0) || 1);
    const length = Math.min(maxLen, minLen);

    for (let dy = 0; dy < length; dy++) {
      const y = startY + dy;
      if (this.isWater(startX, y)) continue;
      const i = this.idx(startX, y);
      this.riverMask[i] = 1;
      this.terrainTypes[i] = _navigableTerrain & 0xff;
    }
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

    const coastTerrain = this.coastTerrainId;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!this.isWater(x, y)) continue;
        let adjacentLand = false;
        for (let dy = -1; dy <= 1 && !adjacentLand; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (!this.isWater(nx, ny)) {
              adjacentLand = true;
              break;
            }
          }
        }
        if (adjacentLand) {
          this.terrainTypes[this.idx(x, y)] = coastTerrain & 0xff;
        }
      }
    }
  }

  // === BIOMES ===

  designateBiomes(width: number, height: number): void {
    // Track call for testing
    this.calls.designateBiomes.push({ width, height });
    // Mock: no-op (biomes already initialized to default)
    this.recordEffect(ENGINE_EFFECT_TAGS.biomesApplied);
  }

  getBiomeGlobal(name: string): number {
    const biomeType = name.toUpperCase().startsWith("BIOME_")
      ? name.toUpperCase()
      : `BIOME_${name.toUpperCase()}`;
    return this.biomeGlobals[biomeType] ?? -1;
  }

  setBiomeType(x: number, y: number, biomeId: number): void {
    this.biomes[this.idx(x, y)] = biomeId;
    this.recordEffect(ENGINE_EFFECT_TAGS.biomesApplied);
  }

  getBiomeType(x: number, y: number): number {
    return this.biomes[this.idx(x, y)];
  }

  // === FEATURES (extended) ===

  addFeatures(width: number, height: number): void {
    // Track call for testing
    this.calls.addFeatures.push({ width, height });
    // Mock: no-op (features already initialized to NO_FEATURE)
    this.recordEffect(ENGINE_EFFECT_TAGS.featuresApplied);
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
    this.recordPlacementEffect();
  }

  generateSnow(width: number, height: number): void {
    this.calls.generateSnow.push({ width, height });
    // Mock: no-op
    this.recordPlacementEffect();
  }

  generateResources(width: number, height: number): void {
    this.calls.generateResources.push({ width, height });
    // Mock: no-op
    this.recordPlacementEffect();
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
    this.recordPlacementEffect();
    // Mock: return array of placeholder positions (one per player)
    const totalPlayers = playersLandmass1 + playersLandmass2;
    return Array.from({ length: totalPlayers }, (_, i) => i * 100);
  }

  generateDiscoveries(width: number, height: number, startPositions: number[]): void {
    this.calls.generateDiscoveries.push({ width, height, startPositions: [...startPositions] });
    // Mock: no-op
    this.recordPlacementEffect();
  }

  assignAdvancedStartRegions(): void {
    this.calls.assignAdvancedStartRegions++;
    // Mock: no-op
    this.recordPlacementEffect();
  }

  addFloodplains(minLength: number, maxLength: number): void {
    this.calls.addFloodplains.push({ minLength, maxLength });
    // Mock: no-op
    this.recordPlacementEffect();
  }

  recalculateFertility(): void {
    this.calls.recalculateFertility++;
    // Mock: no-op
    this.recordPlacementEffect();
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
    this.riverMask.fill(0);
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
    this.effectEvidence.clear();
    this.terrainTypeIndices = config.terrainTypeIndices ?? { ...DEFAULT_TERRAIN_TYPE_INDICES };
    this.plotTags = { ...DEFAULT_PLOT_TAGS, ...(config.plotTags ?? {}) };
    this.landmassIds = { ...DEFAULT_LANDMASS_IDS, ...(config.landmassIds ?? {}) };

    this.coastTerrainId = this.getTerrainTypeIndex("TERRAIN_COAST");
    this.oceanTerrainId = this.getTerrainTypeIndex("TERRAIN_OCEAN");
    this.mountainTerrainId = this.getTerrainTypeIndex("TERRAIN_MOUNTAIN");
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
