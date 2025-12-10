/**
 * @civ7/types - TypeScript definitions for Civilization VII modding runtime
 *
 * This package provides ambient type declarations for:
 * - Global objects (GameplayMap, GameInfo, TerrainBuilder, etc.)
 * - Virtual module imports (/base-standard/...)
 *
 * Usage:
 *   /// <reference types="@civ7/types" />
 *   or add to tsconfig.json "types": ["@civ7/types"]
 */

// =============================================================================
// GLOBAL INTERFACES
// =============================================================================

/**
 * Location coordinates on the game map
 */
interface PlotLocation {
  x: number;
  y: number;
}

/**
 * Feature placement data
 */
interface FeatureData {
  Feature: number;
  Direction: number;
  Elevation: number;
}

/**
 * GameInfo table row with common accessors
 */
interface GameInfoTable<T = any> {
  /** Find row by predicate */
  find(predicate: (row: T) => boolean): T | null;
  /** Lookup row by key */
  lookup(key: string | number): T | null;
  /** Number of rows in the table */
  length: number;
  /** Iterate over all rows */
  [Symbol.iterator](): Iterator<T>;
}

/**
 * Map configuration row from GameInfo.Maps
 */
interface MapConfigRow {
  NumNaturalWonders: number;
  LakeGenerationFrequency: number;
  PlayersLandmass1: number;
  PlayersLandmass2: number;
  StartSectorRows: number;
  StartSectorCols: number;
  Width: number;
  Height: number;
  MinimumResources: number;
  DesiredRivers: number;
  MinIslandSize: number;
  MaxIslandSize: number;
  NumMinorIslands: number;
  [key: string]: any;
}

/**
 * Terrain row from GameInfo.Terrains
 */
interface TerrainRow {
  TerrainType: string;
  Index: number;
  Name: string;
  [key: string]: any;
}

/**
 * Biome row from GameInfo.Biomes
 */
interface BiomeRow {
  BiomeType: string;
  Index: number;
  Name: string;
  [key: string]: any;
}

/**
 * Feature row from GameInfo.Features
 */
interface FeatureRow {
  FeatureType: string;
  Index: number;
  Name: string;
  NaturalWonder: boolean;
  [key: string]: any;
}

/**
 * Resource row from GameInfo.Resources
 */
interface ResourceRow {
  ResourceType: string;
  Index: number;
  Name: string;
  ResourceClassType: string;
  [key: string]: any;
}

// =============================================================================
// GLOBAL DECLARATIONS
// =============================================================================

declare global {
  // ---------------------------------------------------------------------------
  // GameplayMap - Map query and state API (read-only)
  // ---------------------------------------------------------------------------
  const GameplayMap: {
    // Grid dimensions
    getGridWidth(): number;
    getGridHeight(): number;
    getMapSize(): string;

    // Index/location conversion
    getIndexFromXY(x: number, y: number): number;
    getLocationFromIndex(index: number): PlotLocation;
    getAdjacentPlotLocation(x: number, y: number, direction: number): PlotLocation;

    // Terrain queries
    getTerrainType(x: number, y: number): number;
    getBiomeType(x: number, y: number): number;
    getFeatureType(x: number, y: number): number;
    getResourceType(x: number, y: number): number;
    getElevation(x: number, y: number): number;
    getRainfall(x: number, y: number): number;
    getTemperature(x: number, y: number): number;
    getPlotLatitude(x: number, y: number): number;
    getRiverType(x: number, y: number): number;

    // Area/continent queries
    getAreaId(x: number, y: number): number;
    getAreaIsWater(areaId: number): boolean;
    getContinentType(x: number, y: number): number;
    getHemisphere(x: number, y: number): number;
    getPrimaryHemisphere(): number;
    findSecondContinent(): number;

    // Owner/plot queries
    getOwner(x: number, y: number): number;
    getPlotTag(x: number, y: number): number;
    hasPlotTag(x: number, y: number, tag: number): boolean;
    getPlotDistance(x1: number, y1: number, x2: number, y2: number): number;
    getPlotIndicesInRadius(x: number, y: number, radius: number): number[];

    // Predicate queries
    isWater(x: number, y: number): boolean;
    isMountain(x: number, y: number): boolean;
    isLake(x: number, y: number): boolean;
    isRiver(x: number, y: number): boolean;
    isNavigableRiver(x: number, y: number): boolean;
    isCoastalLand(x: number, y: number): boolean;
    isNaturalWonder(x: number, y: number): boolean;
    isImpassable(x: number, y: number): boolean;
    isCliffCrossing(x: number, y: number, direction: number): boolean;

    // Adjacency queries
    isAdjacentToRivers(x: number, y: number, radius?: number): boolean;
    isAdjacentToLand(x: number, y: number): boolean;
    isAdjacentToShallowWater(x: number, y: number): boolean;
    isAdjacentToFeature(x: number, y: number, featureType: number): boolean;

    // RNG
    getRandomSeed(): number;
  };

  // ---------------------------------------------------------------------------
  // TerrainBuilder - Map modification API (write operations)
  // ---------------------------------------------------------------------------
  const TerrainBuilder: {
    // Setters
    setTerrainType(x: number, y: number, terrainType: number): void;
    setBiomeType(x: number, y: number, biomeType: number): void;
    setFeatureType(x: number, y: number, featureData: FeatureData): void;
    setElevation(x: number, y: number, elevation: number): void;
    setRainfall(x: number, y: number, rainfall: number): void;

    // Plot tags
    setPlotTag(x: number, y: number, tag: number): void;
    addPlotTag(x: number, y: number, tag: number): void;
    removePlotTag(x: number, y: number, tag: number): void;

    // Validation
    canHaveFeature(x: number, y: number, featureType: number): boolean;
    canHaveFeatureParam(x: number, y: number, featureType: number, param: any): boolean;
    validateAndFixTerrain(): void;

    // Random number generation
    getRandomNumber(max: number, label: string): number;

    // Map building phases
    stampContinents(): void;
    buildElevation(): void;
    modelRivers(minLength: number, maxLength: number, navigableTerrain: number): void;
    defineNamedRivers(): void;
    storeWaterData(): void;
    addFloodplains(): void;

    // Utilities
    generatePoissonMap(
      width: number,
      height: number,
      minDistance: number,
      maxAttempts: number
    ): PlotLocation[];
    getHeightFromPercent(percent: number): number;
  };

  // ---------------------------------------------------------------------------
  // AreaBuilder - Area/continent management
  // ---------------------------------------------------------------------------
  const AreaBuilder: {
    recalculateAreas(): void;
  };

  // ---------------------------------------------------------------------------
  // FractalBuilder - Fractal noise generation
  // ---------------------------------------------------------------------------
  const FractalBuilder: {
    create(
      fractalId: number,
      width: number,
      height: number,
      grain: number,
      flags: number
    ): void;
    getHeight(fractalId: number, x: number, y: number): number;
  };

  // ---------------------------------------------------------------------------
  // GameInfo - Database tables
  // ---------------------------------------------------------------------------
  const GameInfo: {
    // Core tables
    Maps: GameInfoTable<MapConfigRow>;
    Terrains: GameInfoTable<TerrainRow>;
    Biomes: GameInfoTable<BiomeRow>;
    Features: GameInfoTable<FeatureRow>;
    Resources: GameInfoTable<ResourceRow>;
    Ages: GameInfoTable;
    Civilizations: GameInfoTable;
    Leaders: GameInfoTable;

    // Feature tables
    FeatureClasses: GameInfoTable;
    Feature_NaturalWonders: GameInfoTable;

    // Start bias tables
    StartBiasBiomes: GameInfoTable;
    StartBiasTerrains: GameInfoTable;
    StartBiasRivers: GameInfoTable;
    StartBiasLakes: GameInfoTable;
    StartBiasAdjacentToCoasts: GameInfoTable;
    StartBiasFeatureClasses: GameInfoTable;
    StartBiasNaturalWonders: GameInfoTable;
    StartBiasResources: GameInfoTable;

    // Resource tables
    Resource_Distribution: GameInfoTable;
    MapResourceMinimumAmountModifier: GameInfoTable;

    // Map behavior tables
    MapIslandBehavior: GameInfoTable;
    DiscoverySiftingImprovements: GameInfoTable;

    // Other tables
    GlobalParameters: GameInfoTable;
    AdvancedStartParameters: GameInfoTable;
    NarrativeStories: GameInfoTable;
    Unit_ShadowReplacements: GameInfoTable;

    // Generic accessor for any table
    [tableName: string]: GameInfoTable | undefined;
  };

  // ---------------------------------------------------------------------------
  // engine - Event messaging API
  // ---------------------------------------------------------------------------
  const engine: {
    on(event: string, callback: (...args: any[]) => void): void;
    call(method: string, ...args: any[]): any;
  };

  // ---------------------------------------------------------------------------
  // Configuration - Game settings
  // ---------------------------------------------------------------------------
  const Configuration: {
    getGameValue(key: string): any;
    getMapValue(key: string): any;
  };

  // ---------------------------------------------------------------------------
  // Players - Player management
  // ---------------------------------------------------------------------------
  interface Player {
    isAlive: boolean;
    [key: string]: any;
  }

  interface AdvancedStartPlayer {
    dynamicCardsAddedComplete(): void;
    addDynamicAvailableCard(card: any): void;
    [key: string]: any;
  }

  const Players: {
    get(playerId: number): Player | null;
    AdvancedStart: {
      get(playerId: number): AdvancedStartPlayer | null;
    };
  };

  // ---------------------------------------------------------------------------
  // Game - Game state
  // ---------------------------------------------------------------------------
  const Game: {
    age: number;
    EconomicRules: {
      adjustForGameSpeed(value: number): number;
    };
    PlacementRules: {
      getValidOceanNavalLocation(playerId: number): number;
    };
  };

  // ---------------------------------------------------------------------------
  // Database - Hash utilities
  // ---------------------------------------------------------------------------
  const Database: {
    makeHash(key: string): number;
  };

  // ---------------------------------------------------------------------------
  // PlotTags - Plot tag constants
  // ---------------------------------------------------------------------------
  const PlotTags: {
    [tagName: string]: number;
  };

  // ---------------------------------------------------------------------------
  // FeatureTypes - Feature type constants
  // ---------------------------------------------------------------------------
  const FeatureTypes: {
    [featureName: string]: number;
  };

  // Ensure console is available
  var console: Console;
}

// =============================================================================
// VIRTUAL MODULE DECLARATIONS (/base-standard/...)
// =============================================================================

declare module "/base-standard/maps/map-utilities.js" {
  export function needHumanNearEquator(): boolean;
  export function assignStartingPlots(): void;
  // Add more exports as discovered
}

declare module "/base-standard/maps/assign-starting-plots.js" {
  export function chooseStartSectors(
    numPlayers1: number,
    numPlayers2: number,
    rows: number,
    cols: number,
    humanNearEquator: boolean
  ): any;
  export function assignStartingPlots(): void;
}

declare module "/base-standard/maps/elevation-terrain-generator.js" {
  export function expandCoasts(width: number, height: number): void;
  export function generateLakes(
    width: number,
    height: number,
    tilesPerLake: number
  ): void;
}

declare module "/base-standard/maps/map-globals.js" {
  export const g_AvoidSeamOffset: number;
  export const g_PolarWaterRows: number;
  export const g_HillTerrain: number;
  export const g_NavigableRiverTerrain: number;
  export const g_CommanderUnitIndex: number;
}

declare module "/base-standard/maps/feature-biome-generator.js" {
  export function designateBiomes(width: number, height: number): void;
  export function addFeatures(width: number, height: number): void;
}

declare module "/base-standard/maps/resource-generator.js" {
  export function addResources(): void;
}

declare module "/base-standard/maps/continents.js" {
  // This module has side effects and registers map generation
  const _default: void;
  export default _default;
}

declare module "/base-standard/scripts/voronoi-region.js" {
  export class PlateRegion {
    constructor(id: number, center: PlotLocation);
    id: number;
    center: PlotLocation;
    cells: PlotLocation[];
    neighbors: Set<number>;
    addCell(cell: PlotLocation): void;
  }
}

declare module "/base-standard/scripts/kd-tree.js" {
  export interface RegionCell {
    x: number;
    y: number;
    regionId: number;
  }

  export type RegionCellPosGetter = (cell: RegionCell) => [number, number];

  export class kdTree<T> {
    constructor(points: T[], distance: (a: T, b: T) => number, dimensions: string[]);
    nearest(point: T, count: number): Array<[T, number]>;
  }

  export const VoronoiUtils: {
    assignCellsToRegions(
      cells: RegionCell[],
      regions: any[],
      posGetter: RegionCellPosGetter
    ): void;
  };
}

declare module "/base-standard/scripts/random-pcg-32.js" {
  export class RandomPCG32 {
    constructor(seed: number);
    next(): number;
    nextFloat(): number;
    nextInRange(min: number, max: number): number;
  }
}

// Catch-all for rapid migration - allows any /base-standard/ import
declare module "/base-standard/*" {
  const value: any;
  export = value;
  export default value;
}

export {};
