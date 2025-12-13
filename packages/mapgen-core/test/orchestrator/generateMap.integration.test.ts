import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { bootstrap } from "../../src/bootstrap/entry.js";
import { resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import type { EngineAdapter } from "@civ7/adapter";

/**
 * Minimal integration to pin the canonical config → tunables → orchestrator path.
 *
 * We disable all stage execution via stageManifest to avoid engine dependencies
 * and supply a no-op adapter. The goal is to verify that generateMap() can run
 * end-to-end with schema-defaulted config and bound tunables, not to exercise
 * the full layer pipeline.
 */
describe("integration: bootstrap → tunables → orchestrator (stages disabled)", () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const adapter: EngineAdapter = {
    getGridWidth: () => 84,
    getGridHeight: () => 54,
    getMapSize: () => 1,
    lookupMapInfo: () => ({
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
    }),
    setMapInitData: (params) => calls.push({ method: "setMapInitData", args: [params] }),
    isWater: () => false,
    validateAndFixTerrain: () => calls.push({ method: "validateAndFixTerrain", args: [] }),
    recalculateAreas: () => calls.push({ method: "recalculateAreas", args: [] }),
    stampContinents: () => calls.push({ method: "stampContinents", args: [] }),
    buildElevation: () => calls.push({ method: "buildElevation", args: [] }),
    modelRivers: () => calls.push({ method: "modelRivers", args: [] }),
    defineNamedRivers: () => calls.push({ method: "defineNamedRivers", args: [] }),
    storeWaterData: () => calls.push({ method: "storeWaterData", args: [] }),
    generateLakes: () => calls.push({ method: "generateLakes", args: [] }),
    expandCoasts: () => calls.push({ method: "expandCoasts", args: [] }),
    chooseStartSectors: () => {
      calls.push({ method: "chooseStartSectors", args: [] });
      return [];
    },
    needHumanNearEquator: () => false,
    getRandomNumber: () => 0,
    setTerrainType: () => {},
    setWater: () => {},
    setHeight: () => {},
    getTerrainType: () => 0,
    setPlotTag: () => {},
    getPlotTag: () => 0,
    hasPlotTag: () => false,
    removePlotTag: () => {},
    addPlotTag: () => {},
    setLandmassRegionId: () => {},
  };

  beforeEach(() => {
    calls.length = 0;
    resetTunablesForTest();
  });

  afterEach(() => {
    resetTunablesForTest();
  });

  it("runs generateMap with schema defaults and no stage execution", () => {
    const config = bootstrap({
      // Disable all stages so we only exercise the config/tunables/orchestrator wiring.
      stageManifest: { order: [], stages: {} },
    });

    const orchestrator = new MapOrchestrator(config, {
      adapter,
      mapSizeDefaults: {
        mapSizeId: 1,
        mapInfo: adapter.lookupMapInfo(1),
      },
      logPrefix: "[TEST]",
    });

    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);
  });
});
