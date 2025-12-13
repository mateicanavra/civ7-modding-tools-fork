/**
 * Tests for MapOrchestrator.requestMapData()
 *
 * Verifies that map dimensions and latitude bounds are:
 * 1. Derived from game settings (GameInfo.Maps.lookup)
 * 2. Overrideable via mapSizeDefaults config (for testing)
 * 3. Overrideable via initParams (explicit overrides)
 * 4. Fall back to standard defaults when game info unavailable
 *
 * @module test/orchestrator/requestMapData
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import { getDefaultConfig } from "../../src/config/index.js";

describe("MapOrchestrator.requestMapData", () => {
  // Capture SetMapInitData calls via engine.call spy
  let capturedInitData: unknown[] = [];
  let originalEngine: typeof globalThis.engine | undefined;

  beforeEach(() => {
    capturedInitData = [];

    // Save original engine reference
    originalEngine = (globalThis as unknown as { engine?: typeof globalThis.engine }).engine;

    // Create spy for engine.call("SetMapInitData", params)
    (globalThis as unknown as { engine: { call: (name: string, params: unknown) => void } }).engine =
      {
        call: (name: string, params: unknown) => {
          if (name === "SetMapInitData") {
            capturedInitData.push(params);
          }
        },
      };
  });

  afterEach(() => {
    // Restore original engine
    if (originalEngine !== undefined) {
      (globalThis as unknown as { engine: typeof originalEngine }).engine = originalEngine;
    }
  });

  describe("with mapSizeDefaults config", () => {
    it("should use dimensions from mapSizeDefaults.mapInfo", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 104,
            GridHeight: 64,
            MinLatitude: -85,
            MaxLatitude: 85,
          },
        },
      });

      orchestrator.requestMapData();

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(104);
      expect(params.height).toBe(64);
      expect(params.topLatitude).toBe(85);
      expect(params.bottomLatitude).toBe(-85);
    });

    it("should use standard fallbacks when mapInfo is null", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: -1,
          mapInfo: undefined,
        },
      });

      orchestrator.requestMapData();

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      // Should fall back to MAPSIZE_STANDARD defaults
      expect(params.width).toBe(84);
      expect(params.height).toBe(54);
      expect(params.topLatitude).toBe(80);
      expect(params.bottomLatitude).toBe(-80);
    });

    it("should use partial mapInfo with fallbacks for missing fields", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 120,
            // GridHeight, MinLatitude, MaxLatitude missing
          },
        },
      });

      orchestrator.requestMapData();

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(120); // From mapInfo
      expect(params.height).toBe(54); // Fallback
      expect(params.topLatitude).toBe(80); // Fallback
      expect(params.bottomLatitude).toBe(-80); // Fallback
    });
  });

  describe("with initParams overrides", () => {
    it("should allow explicit dimension overrides via initParams", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 84,
            GridHeight: 54,
            MinLatitude: -80,
            MaxLatitude: 80,
          },
        },
      });

      // Explicit overrides should take precedence
      orchestrator.requestMapData({
        width: 200,
        height: 100,
      });

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(200); // Override
      expect(params.height).toBe(100); // Override
      expect(params.topLatitude).toBe(80); // From mapInfo
      expect(params.bottomLatitude).toBe(-80); // From mapInfo
    });

    it("should allow explicit latitude overrides via initParams", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 84,
            GridHeight: 54,
            MinLatitude: -80,
            MaxLatitude: 80,
          },
        },
      });

      orchestrator.requestMapData({
        topLatitude: 90,
        bottomLatitude: -90,
      });

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(84); // From mapInfo
      expect(params.height).toBe(54); // From mapInfo
      expect(params.topLatitude).toBe(90); // Override
      expect(params.bottomLatitude).toBe(-90); // Override
    });

    it("should allow wrapX/wrapY overrides via initParams", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: { GridWidth: 84, GridHeight: 54 },
        },
      });

      orchestrator.requestMapData({
        wrapX: false,
        wrapY: true,
      });

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        wrapX: boolean;
        wrapY: boolean;
      };

      expect(params.wrapX).toBe(false);
      expect(params.wrapY).toBe(true);
    });
  });

  describe("default wrapX/wrapY behavior", () => {
    it("should default to wrapX=true, wrapY=false", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: { GridWidth: 84, GridHeight: 54 },
        },
      });

      orchestrator.requestMapData();

      expect(capturedInitData.length).toBe(1);
      const params = capturedInitData[0] as {
        wrapX: boolean;
        wrapY: boolean;
      };

      expect(params.wrapX).toBe(true);
      expect(params.wrapY).toBe(false);
    });
  });

  describe("different map sizes", () => {
    it("should respect large map dimensions from mapInfo", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 2, // Simulating MAPSIZE_LARGE
          mapInfo: {
            GridWidth: 104,
            GridHeight: 64,
            MinLatitude: -85,
            MaxLatitude: 85,
          },
        },
      });

      orchestrator.requestMapData();

      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(104);
      expect(params.height).toBe(64);
      expect(params.topLatitude).toBe(85);
      expect(params.bottomLatitude).toBe(-85);
    });

    it("should respect small map dimensions from mapInfo", () => {
      const orchestrator = new MapOrchestrator(getDefaultConfig(), {
        mapSizeDefaults: {
          mapSizeId: 0, // Simulating MAPSIZE_SMALL
          mapInfo: {
            GridWidth: 74,
            GridHeight: 46,
            MinLatitude: -75,
            MaxLatitude: 75,
          },
        },
      });

      orchestrator.requestMapData();

      const params = capturedInitData[0] as {
        width: number;
        height: number;
        topLatitude: number;
        bottomLatitude: number;
      };

      expect(params.width).toBe(74);
      expect(params.height).toBe(46);
      expect(params.topLatitude).toBe(75);
      expect(params.bottomLatitude).toBe(-75);
    });
  });
});
