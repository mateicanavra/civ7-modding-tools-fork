/**
 * Bun test setup - Mock Civ7 globals for testing
 *
 * This file is preloaded before all tests via bunfig.toml.
 * It provides minimal mocks so that code referencing Civ7 globals
 * doesn't crash during test execution.
 */

import { mock } from "bun:test";

// Mock /base-standard/ modules that Civ7Adapter imports
// These are Civ7 runtime paths that don't exist in test environment
mock.module("/base-standard/maps/map-globals.js", () => ({}));
mock.module("/base-standard/maps/feature-biome-generator.js", () => ({
  designateBiomes: () => {},
  addFeatures: () => {},
}));
mock.module("/base-standard/maps/natural-wonder-generator.js", () => ({
  addNaturalWonders: () => {},
}));
mock.module("/base-standard/maps/snow-generator.js", () => ({
  generateSnow: () => {},
}));
mock.module("/base-standard/maps/resource-generator.js", () => ({
  generateResources: () => {},
}));
mock.module("/base-standard/maps/assign-starting-plots.js", () => ({
  assignStartPositions: () => [],
  chooseStartSectors: () => [],
}));
mock.module("/base-standard/maps/map-utilities.js", () => ({
  needHumanNearEquator: () => false,
}));
mock.module("/base-standard/maps/discovery-generator.js", () => ({
  generateDiscoveries: () => {},
}));
mock.module("/base-standard/maps/assign-advanced-start-region.js", () => ({
  assignAdvancedStartRegions: () => {},
}));

// Mock engine API
(globalThis as any).engine = {
  on: () => {},
  call: () => {},
};

// Mock GameplayMap
(globalThis as any).GameplayMap = {
  getGridWidth: () => 128,
  getGridHeight: () => 80,
  getMapSize: () => "MAPSIZE_HUGE",
  getIndexFromXY: (x: number, y: number) => y * 128 + x,
  getLocationFromIndex: (index: number) => ({ x: index % 128, y: Math.floor(index / 128) }),
  getAdjacentPlotLocation: () => ({ x: 0, y: 0 }),
  isWater: () => false,
  isMountain: () => false,
  isLake: () => false,
  isRiver: () => false,
  isNavigableRiver: () => false,
  isCoastalLand: () => false,
  isNaturalWonder: () => false,
  isImpassable: () => false,
  isCliffCrossing: () => false,
  isAdjacentToRivers: () => false,
  isAdjacentToLand: () => false,
  isAdjacentToShallowWater: () => false,
  isAdjacentToFeature: () => false,
  getTerrainType: () => 0,
  getBiomeType: () => 0,
  getFeatureType: () => -1,
  getResourceType: () => -1,
  getElevation: () => 100,
  getRainfall: () => 50,
  getTemperature: () => 15,
  getPlotLatitude: () => 0,
  getRiverType: () => 0,
  getAreaId: () => 0,
  getAreaIsWater: () => false,
  getContinentType: () => 0,
  getHemisphere: () => 0,
  getPrimaryHemisphere: () => 0,
  findSecondContinent: () => 1,
  getOwner: () => -1,
  getPlotTag: () => 0,
  hasPlotTag: () => false,
  getPlotDistance: () => 0,
  getPlotIndicesInRadius: () => [],
  getRandomSeed: () => 12345,
};

// Mock TerrainBuilder
(globalThis as any).TerrainBuilder = {
  setTerrainType: () => {},
  setBiomeType: () => {},
  setFeatureType: () => {},
  setRainfall: () => {},
  setPlotTag: () => {},
  addPlotTag: () => {},
  removePlotTag: () => {},
  canHaveFeature: () => true,
  canHaveFeatureParam: () => true,
  validateAndFixTerrain: () => {},
  getRandomNumber: (max: number) => Math.floor(Math.random() * max),
  stampContinents: () => {},
  buildElevation: () => {},
  modelRivers: () => {},
  defineNamedRivers: () => {},
  storeWaterData: () => {},
  addFloodplains: () => {},
  generatePoissonMap: () => [],
};

// Mock AreaBuilder
(globalThis as any).AreaBuilder = {
  recalculateAreas: () => {},
};

// Mock FractalBuilder
(globalThis as any).FractalBuilder = {
  create: () => {},
  getHeight: () => 0,
  getHeightFromPercent: (_fractalId: number, percent: number) => percent * 500,
};

// Mock GameInfo
(globalThis as any).GameInfo = {
  Maps: {
    find: () => null,
    lookup: () => ({
      NumNaturalWonders: 4,
      LakeGenerationFrequency: 10,
      PlayersLandmass1: 2,
      PlayersLandmass2: 2,
      StartSectorRows: 4,
      StartSectorCols: 4,
      Width: 128,
      Height: 80,
    }),
    length: 5,
    [Symbol.iterator]: function* () {},
  },
  Terrains: { find: () => null, lookup: () => null, length: 10, [Symbol.iterator]: function* () {} },
  Biomes: { find: () => null, lookup: () => null, length: 8, [Symbol.iterator]: function* () {} },
  Features: { find: () => null, lookup: () => null, length: 20, [Symbol.iterator]: function* () {} },
  Resources: { find: () => null, lookup: () => null, length: 30, [Symbol.iterator]: function* () {} },
  Ages: { find: () => null, lookup: () => null, length: 3, [Symbol.iterator]: function* () {} },
  Civilizations: { find: () => null, lookup: () => null, length: 10, [Symbol.iterator]: function* () {} },
  Leaders: { find: () => null, lookup: () => null, length: 10, [Symbol.iterator]: function* () {} },
  FeatureClasses: { find: () => null, lookup: () => null, length: 5, [Symbol.iterator]: function* () {} },
  Feature_NaturalWonders: { find: () => null, lookup: () => null, length: 10, [Symbol.iterator]: function* () {} },
  StartBiasBiomes: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasTerrains: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasRivers: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasLakes: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasAdjacentToCoasts: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasFeatureClasses: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasNaturalWonders: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  StartBiasResources: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  Resource_Distribution: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  MapResourceMinimumAmountModifier: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  MapIslandBehavior: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  DiscoverySiftingImprovements: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  GlobalParameters: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  AdvancedStartParameters: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  NarrativeStories: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
  Unit_ShadowReplacements: { find: () => null, lookup: () => null, length: 0, [Symbol.iterator]: function* () {} },
};

// Mock Configuration
(globalThis as any).Configuration = {
  getGameValue: () => null,
  getMapValue: () => null,
};

// Mock Players
(globalThis as any).Players = {
  get: () => ({ isAlive: true }),
  AdvancedStart: {
    get: () => ({
      dynamicCardsAddedComplete: () => {},
      addDynamicAvailableCard: () => {},
    }),
  },
};

// Mock Game
(globalThis as any).Game = {
  age: 0,
  EconomicRules: {
    adjustForGameSpeed: (v: number) => v,
  },
  PlacementRules: {
    getValidOceanNavalLocation: () => -1,
  },
};

// Mock Database
(globalThis as any).Database = {
  makeHash: (key: string) => key.split("").reduce((a, b) => a + b.charCodeAt(0), 0),
};

// Mock PlotTags
(globalThis as any).PlotTags = {};

// Mock FeatureTypes
(globalThis as any).FeatureTypes = {};

// Ensure console is available
(globalThis as any).console = console;
