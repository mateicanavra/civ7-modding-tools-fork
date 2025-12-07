/**
 * Bootstrap Entry Tests
 *
 * Tests for bootstrap/resetBootstrap/rebind functions.
 * Key acceptance criteria: importing @swooper/mapgen-core/bootstrap does NOT crash without globals.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  bootstrap,
  resetBootstrap,
  rebind,
  getConfig,
  getTunables,
  resetTunables,
} from "../../src/bootstrap/entry.js";

describe("bootstrap/entry", () => {
  beforeEach(() => {
    resetBootstrap();
  });

  describe("import safety", () => {
    it("can be imported without globals available", () => {
      // This test passes if the import at the top of this file succeeded
      expect(bootstrap).toBeDefined();
      expect(resetBootstrap).toBeDefined();
      expect(rebind).toBeDefined();
    });

    it("functions are callable without game engine globals", () => {
      // Should not throw even without RandomImpl, etc.
      expect(() => bootstrap()).not.toThrow();
      expect(() => resetBootstrap()).not.toThrow();
      expect(() => rebind()).not.toThrow();
    });
  });

  describe("bootstrap", () => {
    it("accepts empty options", () => {
      expect(() => bootstrap()).not.toThrow();
      expect(() => bootstrap({})).not.toThrow();
    });

    it("stores presets in config", () => {
      bootstrap({ presets: ["classic", "temperate"] });

      const config = getConfig();
      expect(config.presets).toEqual(["classic", "temperate"]);
    });

    it("stores overrides in config", () => {
      bootstrap({
        overrides: {
          foundation: { plates: { count: 12 } },
        },
      });

      const config = getConfig();
      expect(config.foundation?.plates?.count).toBe(12);
    });

    it("stores stageConfig in config", () => {
      bootstrap({
        stageConfig: {
          foundation: true,
          climate: false,
        },
      });

      const config = getConfig();
      expect(config.stageConfig?.foundation).toBe(true);
      expect(config.stageConfig?.climate).toBe(false);
    });

    it("triggers tunables rebind", () => {
      // Get tunables with defaults
      const before = getTunables();
      expect(before.FOUNDATION_PLATES.count).toBe(8);

      // Bootstrap with override
      bootstrap({
        overrides: {
          foundation: { plates: { count: 16 } },
        },
      });

      const after = getTunables();
      expect(after.FOUNDATION_PLATES.count).toBe(16);
    });

    it("filters invalid preset values", () => {
      bootstrap({
        presets: ["valid", 123 as unknown as string, null as unknown as string, "another"],
      });

      const config = getConfig();
      expect(config.presets).toEqual(["valid", "another"]);
    });
  });

  describe("resetBootstrap", () => {
    it("resets config and tunables", () => {
      bootstrap({
        presets: ["test"],
        overrides: { toggles: { STORY_ENABLE_HOTSPOTS: false } },
      });

      resetBootstrap();

      const config = getConfig();
      const tunables = getTunables();

      expect(config.presets).toBeUndefined();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
    });

    it("allows fresh bootstrap after reset", () => {
      bootstrap({ presets: ["first"] });
      resetBootstrap();
      bootstrap({ presets: ["second"] });

      const config = getConfig();
      expect(config.presets).toEqual(["second"]);
    });
  });

  describe("rebind", () => {
    it("refreshes tunables from current config", () => {
      bootstrap({ overrides: { landmass: { baseWaterPercent: 50 } } });

      const tunables = getTunables();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(50);
    });

    it("can be called multiple times", () => {
      expect(() => {
        rebind();
        rebind();
        rebind();
      }).not.toThrow();
    });
  });

  describe("integration", () => {
    it("full bootstrap -> rebind -> reset cycle", () => {
      // Initial state
      expect(getTunables().FOUNDATION_PLATES.count).toBe(8);

      // Bootstrap with overrides
      bootstrap({
        presets: ["continent"],
        overrides: {
          foundation: { plates: { count: 10 } },
          toggles: { STORY_ENABLE_OROGENY: false },
        },
      });

      expect(getConfig().presets).toEqual(["continent"]);
      expect(getTunables().FOUNDATION_PLATES.count).toBe(10);
      expect(getTunables().STORY_ENABLE_OROGENY).toBe(false);

      // Rebind (should maintain state)
      rebind();
      expect(getTunables().FOUNDATION_PLATES.count).toBe(10);

      // Reset
      resetBootstrap();
      expect(getConfig().presets).toBeUndefined();
      expect(getTunables().FOUNDATION_PLATES.count).toBe(8);
      expect(getTunables().STORY_ENABLE_OROGENY).toBe(true);
    });
  });

  describe("test isolation", () => {
    it("starts clean in each test", () => {
      const config = getConfig();
      const tunables = getTunables();

      expect(config.presets).toBeUndefined();
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
    });
  });
});
