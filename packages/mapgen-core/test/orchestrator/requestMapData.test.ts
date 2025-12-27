/**
 * Tests for applyMapInitData()
 *
 * Verifies that map dimensions and latitude bounds are:
 * 1. Derived from game settings (GameInfo.Maps.lookup)
 * 2. Overrideable via mapSizeDefaults config (for testing)
 * 3. Overrideable via initParams (explicit overrides)
 *
 * @module test/orchestrator/requestMapData
 */

import { describe, it, expect } from "bun:test";
import { applyMapInitData } from "@mapgen/index.js";
import { createMockAdapter } from "@civ7/adapter/mock";

describe("applyMapInitData", () => {
  describe("with mapSizeDefaults config", () => {
    it("should use dimensions from mapSizeDefaults.mapInfo", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 104,
            GridHeight: 64,
            MinLatitude: -85,
            MaxLatitude: 85,
          },
        },
      };

      applyMapInitData(options);

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(104);
      expect(params.height).toBe(64);
      expect(params.topLatitude).toBe(85);
      expect(params.bottomLatitude).toBe(-85);
    });

    it("should throw when mapInfo is missing", () => {
      const adapter = createMockAdapter();
      expect(() => {
        applyMapInitData({
          adapter,
          mapSizeDefaults: {
            mapSizeId: -1,
            // @ts-expect-error - intentionally invalid test input
            mapInfo: undefined,
          },
        });
      }).toThrow();
      expect(adapter.calls.setMapInitData.length).toBe(0);
    });

    it("should throw when mapInfo is missing required fields", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 120,
            // GridHeight, MinLatitude, MaxLatitude missing
          },
        },
      };

      expect(() => applyMapInitData(options)).toThrow();
      expect(adapter.calls.setMapInitData.length).toBe(0);
    });
  });

  describe("with initParams overrides", () => {
    it("should allow initParams-only usage without mapSizeDefaults", () => {
      const adapter = createMockAdapter();

      applyMapInitData(
        { adapter },
        {
          width: 96,
          height: 60,
          topLatitude: 80,
          bottomLatitude: -80,
          wrapX: false,
        }
      );

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(96);
      expect(params.height).toBe(60);
      expect(params.topLatitude).toBe(80);
      expect(params.bottomLatitude).toBe(-80);
      expect(params.wrapX).toBe(false);
      expect(params.wrapY).toBe(false);
    });

    it("should allow explicit dimension overrides via initParams", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 84,
            GridHeight: 54,
            MinLatitude: -80,
            MaxLatitude: 80,
          },
        },
      };

      // Explicit overrides should take precedence
      applyMapInitData(options, {
        width: 200,
        height: 100,
      });

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(200); // Override
      expect(params.height).toBe(100); // Override
      expect(params.topLatitude).toBe(80); // From mapInfo
      expect(params.bottomLatitude).toBe(-80); // From mapInfo
    });

    it("should allow explicit latitude overrides via initParams", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: {
            GridWidth: 84,
            GridHeight: 54,
            MinLatitude: -80,
            MaxLatitude: 80,
          },
        },
      };

      applyMapInitData(options, {
        topLatitude: 90,
        bottomLatitude: -90,
      });

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(84); // From mapInfo
      expect(params.height).toBe(54); // From mapInfo
      expect(params.topLatitude).toBe(90); // Override
      expect(params.bottomLatitude).toBe(-90); // Override
    });

    it("should allow wrapX/wrapY overrides via initParams", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: { GridWidth: 84, GridHeight: 54, MinLatitude: -80, MaxLatitude: 80 },
        },
      };

      applyMapInitData(options, {
        wrapX: false,
        wrapY: true,
      });

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.wrapX).toBe(false);
      expect(params.wrapY).toBe(true);
    });
  });

  describe("default wrapX/wrapY behavior", () => {
    it("should default to wrapX=true, wrapY=false", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 1,
          mapInfo: { GridWidth: 84, GridHeight: 54, MinLatitude: -80, MaxLatitude: 80 },
        },
      };

      applyMapInitData(options);

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.wrapX).toBe(true);
      expect(params.wrapY).toBe(false);
    });
  });

  describe("different map sizes", () => {
    it("should respect large map dimensions from mapInfo", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 2, // Simulating MAPSIZE_LARGE
          mapInfo: {
            GridWidth: 104,
            GridHeight: 64,
            MinLatitude: -85,
            MaxLatitude: 85,
          },
        },
      };

      applyMapInitData(options);

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(104);
      expect(params.height).toBe(64);
      expect(params.topLatitude).toBe(85);
      expect(params.bottomLatitude).toBe(-85);
    });

    it("should respect small map dimensions from mapInfo", () => {
      const adapter = createMockAdapter();
      const options = {
        adapter,
        mapSizeDefaults: {
          mapSizeId: 0, // Simulating MAPSIZE_SMALL
          mapInfo: {
            GridWidth: 74,
            GridHeight: 46,
            MinLatitude: -75,
            MaxLatitude: 75,
          },
        },
      };

      applyMapInitData(options);

      expect(adapter.calls.setMapInitData.length).toBe(1);
      const params = adapter.calls.setMapInitData[0]!;

      expect(params.width).toBe(74);
      expect(params.height).toBe(46);
      expect(params.topLatitude).toBe(75);
      expect(params.bottomLatitude).toBe(-75);
    });
  });
});
