import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { bootstrap } from "../../src/bootstrap/entry.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import type { EngineAdapter } from "@civ7/adapter";

/**
 * Minimal integration to pin the canonical config → orchestrator path.
 *
 * We disable all stage execution via stageConfig to avoid layer dependencies
 * and supply a no-op adapter. The goal is to verify that generateMap() can run
 * end-to-end with schema-defaulted config, not to exercise the full layer pipeline.
 *
 * ## Adapter Architecture
 *
 * MapOrchestrator uses two distinct adapters:
 *
 * 1. **EngineAdapter** (from `@civ7/adapter`): Used for terrain/biome/feature operations
 *    in layers and WorldModel. Passed via `OrchestratorConfig.adapter`.
 *
 * 2. **OrchestratorAdapter** (internal): Used for Civ7 map-init operations (map size,
 *    SetMapInitData, GameplayMap/GameInfo, lake/coast stamping). Always resolved from
 *    engine globals via `resolveOrchestratorAdapter()` — NOT configurable via options.
 *
 * Tests that need to control orchestrator-level behavior must stub the globals
 * (GameplayMap, GameInfo, engine.call, TerrainBuilder, AreaBuilder) that
 * `resolveOrchestratorAdapter()` reads from.
 */
describe("integration: bootstrap → orchestrator (stages disabled)", () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  // EngineAdapter mock for layer operations (terrain, biomes, features, WorldModel)
  // This is the proper EngineAdapter interface from @civ7/adapter
  const engineAdapter: EngineAdapter = {
    width: 84,
    height: 54,
    isWater: () => false,
    isMountain: () => false,
    isAdjacentToRivers: () => false,
    getElevation: () => 0,
    getTerrainType: () => 0,
    getRainfall: () => 100,
    getTemperature: () => 20,
    getLatitude: () => 0,
    setTerrainType: () => {},
    setRainfall: () => {},
    setLandmassRegionId: () => {},
    addPlotTag: () => {},
    setPlotTag: () => {},
    getFeatureType: () => -1,
    setFeatureType: () => {},
    canHaveFeature: () => true,
    getRandomNumber: () => 0,
    validateAndFixTerrain: () => {},
    recalculateAreas: () => {},
    createFractal: () => {},
    getFractalHeight: () => 0,
    stampContinents: () => {},
    buildElevation: () => {},
    modelRivers: () => {},
    defineNamedRivers: () => {},
    storeWaterData: () => {},
    designateBiomes: () => {},
    getBiomeGlobal: () => 0,
    setBiomeType: () => {},
    getBiomeType: () => 0,
    addFeatures: () => {},
    getFeatureTypeIndex: () => -1,
    NO_FEATURE: -1,
    addNaturalWonders: () => {},
    generateSnow: () => {},
    generateResources: () => {},
    assignStartPositions: () => [],
    generateDiscoveries: () => {},
    assignAdvancedStartRegions: () => {},
    addFloodplains: () => {},
    recalculateFertility: () => {},
    chooseStartSectors: () => [],
    needHumanNearEquator: () => false,
  };

  // Map info for orchestrator operations
  const mapInfo = {
    GridWidth: 84,
    GridHeight: 54,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  // Store original globals for restoration
  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;
  let originalEngine: unknown;
  let originalTerrainBuilder: unknown;
  let originalAreaBuilder: unknown;

  beforeEach(() => {
    calls.length = 0;

    // Save original globals
    originalGameplayMap = (globalThis as Record<string, unknown>).GameplayMap;
    originalGameInfo = (globalThis as Record<string, unknown>).GameInfo;
    originalEngine = (globalThis as Record<string, unknown>).engine;
    originalTerrainBuilder = (globalThis as Record<string, unknown>).TerrainBuilder;
    originalAreaBuilder = (globalThis as Record<string, unknown>).AreaBuilder;

    // Stub globals for OrchestratorAdapter (map-init operations)
    (globalThis as Record<string, unknown>).GameplayMap = {
      getGridWidth: () => 84,
      getGridHeight: () => 54,
      getMapSize: () => 1,
      isWater: () => false,
    };

    (globalThis as Record<string, unknown>).GameInfo = {
      Maps: {
        lookup: () => mapInfo,
      },
    };

    (globalThis as Record<string, unknown>).engine = {
      call: (name: string, params: unknown) => {
        calls.push({ method: `engine.call:${name}`, args: [params] });
      },
    };

    (globalThis as Record<string, unknown>).TerrainBuilder = {
      validateAndFixTerrain: () => calls.push({ method: "validateAndFixTerrain", args: [] }),
      stampContinents: () => calls.push({ method: "stampContinents", args: [] }),
      buildElevation: () => calls.push({ method: "buildElevation", args: [] }),
      modelRivers: () => calls.push({ method: "modelRivers", args: [] }),
      defineNamedRivers: () => calls.push({ method: "defineNamedRivers", args: [] }),
      storeWaterData: () => calls.push({ method: "storeWaterData", args: [] }),
      setPlotTag: () => {},
      addPlotTag: () => {},
    };

    (globalThis as Record<string, unknown>).AreaBuilder = {
      recalculateAreas: () => calls.push({ method: "recalculateAreas", args: [] }),
    };
  });

  afterEach(() => {
    // Restore original globals
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;
    (globalThis as Record<string, unknown>).engine = originalEngine;
    (globalThis as Record<string, unknown>).TerrainBuilder = originalTerrainBuilder;
    (globalThis as Record<string, unknown>).AreaBuilder = originalAreaBuilder;
  });

  it("runs generateMap with schema defaults and no stage execution", () => {
    const config = bootstrap({
      // Disable all stages so we only exercise orchestrator scaffolding.
      stageConfig: {},
    });

    const orchestrator = new MapOrchestrator(config, {
      // EngineAdapter for layer operations only
      adapter: engineAdapter,
      // mapSizeDefaults bypasses some orchestrator adapter calls in requestMapData
      // but generateMap still uses orchestrator adapter for grid dimensions
      mapSizeDefaults: {
        mapSizeId: 1,
        mapInfo,
      },
      logPrefix: "[TEST]",
    });

    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);
  });

  it("calls orchestrator adapter methods for map-init operations", () => {
    const config = bootstrap({
      stageConfig: {},
    });

    const orchestrator = new MapOrchestrator(config, {
      adapter: engineAdapter,
      mapSizeDefaults: { mapSizeId: 1, mapInfo },
      logPrefix: "[TEST]",
    });

    orchestrator.generateMap();

    // Orchestrator operations should go through the stubbed globals
    // (recalculateAreas, buildElevation are always called)
    expect(calls.some((c) => c.method === "recalculateAreas")).toBe(true);
    expect(calls.some((c) => c.method === "buildElevation")).toBe(true);
  });
});
