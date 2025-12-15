import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { bootstrap } from "../../src/bootstrap/entry.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import { resetConfigProviderForTest, WorldModel } from "../../src/world/model.js";
import { createMockAdapter } from "@civ7/adapter";

describe("MapOrchestrator WorldModel config wiring", () => {
  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    resetConfigProviderForTest();
    WorldModel.reset();

    originalGameplayMap = (globalThis as Record<string, unknown>).GameplayMap;
    originalGameInfo = (globalThis as Record<string, unknown>).GameInfo;

    (globalThis as Record<string, unknown>).GameplayMap = {
      getGridWidth: () => 24,
      getGridHeight: () => 16,
      getMapSize: () => 1,
      isWater: () => false,
    };

    (globalThis as Record<string, unknown>).GameInfo = {
      Maps: {
        lookup: () => ({
          GridWidth: 24,
          GridHeight: 16,
          MinLatitude: -80,
          MaxLatitude: 80,
          NumNaturalWonders: 0,
          LakeGenerationFrequency: 0,
          PlayersLandmass1: 4,
          PlayersLandmass2: 4,
          StartSectorRows: 4,
          StartSectorCols: 4,
        }),
      },
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;

    resetConfigProviderForTest();
    WorldModel.reset();

    if (originalConsoleLog) {
      console.log = originalConsoleLog;
    }
  });

  it("binds WorldModel config from foundation.plates", () => {
    const plateCount = 6;
    const seen: string[] = [];

    originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      seen.push(args.map((v) => String(v)).join(" "));
    };

    const config = bootstrap({
      stageConfig: { foundation: true },
      overrides: {
        foundation: {
          diagnostics: {
            enabled: true,
            logFoundationPlates: true,
          },
          plates: {
            count: plateCount,
          },
        },
      },
    });

    const adapter = createMockAdapter({
      width: 24,
      height: 16,
      rng: () => 0,
    });

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();
    expect(result.success).toBe(true);

    expect(
      seen.some((line) => line.includes(`[WorldModel] Config plates.count=${plateCount}`))
    ).toBe(true);
  });

  it("logs effective mountains config when LOG_MOUNTAINS is enabled", () => {
    const seen: string[] = [];

    originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      seen.push(args.map((v) => String(v)).join(" "));
    };

    const config = bootstrap({
      stageConfig: { foundation: true, mountains: true },
      overrides: {
        foundation: {
          diagnostics: {
            enabled: true,
            logMountains: true,
          },
        },
        mountains: {
          tectonicIntensity: 0.42,
          mountainThreshold: 0.91,
          hillThreshold: 0.37,
          boundaryWeight: 0.8,
          boundaryExponent: 1.9,
        },
      },
    });

    const adapter = createMockAdapter({
      width: 24,
      height: 16,
      rng: () => 0,
    });

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();
    expect(result.success).toBe(true);

    expect(
      seen.some(
        (line) =>
          line.includes("[Mountains] thresholds") &&
          line.includes("mountain=0.91") &&
          line.includes("hill=0.37") &&
          line.includes("tectonicIntensity=0.42") &&
          line.includes("boundaryWeight=0.8") &&
          line.includes("boundaryExponent=1.9")
      )
    ).toBe(true);
  });
});
