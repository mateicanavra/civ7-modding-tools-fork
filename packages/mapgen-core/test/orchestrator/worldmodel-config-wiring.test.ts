import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { bootstrap } from "../../src/bootstrap/entry.js";
import { resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import { resetConfigProviderForTest, WorldModel } from "../../src/world/model.js";
import type { EngineAdapter } from "@civ7/adapter";

describe("MapOrchestrator WorldModel config wiring", () => {
  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    resetTunablesForTest();
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

    resetTunablesForTest();
    resetConfigProviderForTest();
    WorldModel.reset();

    if (originalConsoleLog) {
      console.log = originalConsoleLog;
    }
  });

  it("binds WorldModel config from foundation.plates (via tunables)", () => {
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
          plates: {
            count: plateCount,
          },
        },
      },
    });

    const adapter = {
      width: 24,
      height: 16,
      getRandomNumber: () => 0,
    } as unknown as EngineAdapter;

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();
    expect(result.success).toBe(true);

    expect(
      seen.some((line) => line.includes(`[WorldModel] Config plates.count=${plateCount}`))
    ).toBe(true);
  });
});

