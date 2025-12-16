import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap, MapOrchestrator } from "../../src/index.js";
import {
  resetStoryOverlays,
  getStoryOverlayRegistry,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";
import { resetStoryTags } from "../../src/domain/narrative/tags/index.js";

describe("orchestrator: paleo hydrology runs post-rivers", () => {
  const width = 12;
  const height = 8;
  const mapInfo = {
    GridWidth: width,
    GridHeight: height,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;

  beforeEach(() => {
    resetStoryTags();
    resetStoryOverlays();

    originalGameplayMap = (globalThis as Record<string, unknown>).GameplayMap;
    originalGameInfo = (globalThis as Record<string, unknown>).GameInfo;

    (globalThis as Record<string, unknown>).GameplayMap = {
      getGridWidth: () => width,
      getGridHeight: () => height,
      getMapSize: () => 1,
      getIndexFromXY: (x: number, y: number) => y * width + x,
      getLocationFromIndex: (index: number) => ({
        x: index % width,
        y: Math.floor(index / width),
      }),
      getPlotLatitude: () => 0,
      getRandomSeed: () => 12345,
      isWater: () => false,
    };

    (globalThis as Record<string, unknown>).GameInfo = {
      Maps: {
        lookup: () => mapInfo,
      },
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;
  });

  function readPaleoDeltas(): number {
    const overlay = getStoryOverlayRegistry().get(STORY_OVERLAY_KEYS.PALEO);
    const summary = (overlay as { summary?: { deltas?: number } } | undefined)?.summary;
    return (summary?.deltas ?? 0) | 0;
  }

  it("legacy generateMap runs paleo after modelRivers", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
    });

    // Ensure there are coastal land tiles (y=1 adjacent to water at y=0).
    for (let x = 0; x < width; x++) {
      (adapter as any).setWater(x, 0, true);
    }

    let modeled = false;
    const originalModelRivers = adapter.modelRivers.bind(adapter);
    (adapter as any).modelRivers = (...args: unknown[]) => {
      modeled = true;
      return originalModelRivers(...(args as [number, number, number]));
    };
    (adapter as any).isAdjacentToRivers = () => modeled;

    const config = bootstrap({
      stageConfig: {
        foundation: true,
        climateBaseline: true,
        storySwatches: true,
        rivers: true,
      },
      overrides: {
        climate: {
          story: {
            paleo: {
              maxDeltas: 1,
              deltaFanRadius: 1,
              deltaMarshChance: 0,
              maxOxbows: 0,
              maxFossilChannels: 0,
            },
          },
        },
      },
    });

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();
    expect(result.success).toBe(true);
    expect(readPaleoDeltas()).toBe(1);
  });

  it("TaskGraph runs paleo after modelRivers", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
    });

    for (let x = 0; x < width; x++) {
      (adapter as any).setWater(x, 0, true);
    }

    let modeled = false;
    const originalModelRivers = adapter.modelRivers.bind(adapter);
    (adapter as any).modelRivers = (...args: unknown[]) => {
      modeled = true;
      return originalModelRivers(...(args as [number, number, number]));
    };
    (adapter as any).isAdjacentToRivers = () => modeled;

    const stageManifest = {
      order: ["foundation", "climateBaseline", "storySwatches", "rivers"],
      stages: {
        foundation: { enabled: true, requires: [], provides: [] },
        climateBaseline: { enabled: true, requires: [], provides: [] },
        storySwatches: { enabled: true, requires: [], provides: [] },
        rivers: { enabled: true, requires: [], provides: [] },
      },
    };

    const config = bootstrap({
      stageConfig: {},
      overrides: {
        stageManifest,
        climate: {
          story: {
            paleo: {
              maxDeltas: 1,
              deltaFanRadius: 1,
              deltaMarshChance: 0,
              maxOxbows: 0,
              maxFossilChannels: 0,
            },
          },
        },
      },
    });

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();
    expect(result.success).toBe(true);
    expect(readPaleoDeltas()).toBe(1);
  });
});
