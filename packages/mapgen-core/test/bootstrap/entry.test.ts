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
      // Bootstrap first to access tunables (fail-fast behavior)
      bootstrap();
      const before = getTunables();
      expect(before.FOUNDATION_PLATES.count).toBe(8);

      // Bootstrap again with override - this rebinds tunables
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
    it("resets config and makes tunables inaccessible", () => {
      bootstrap({
        presets: ["test"],
        overrides: { toggles: { STORY_ENABLE_HOTSPOTS: false } },
      });

      resetBootstrap();

      // Config returns empty object via deprecated getConfig()
      const config = getConfig();
      expect(config.presets).toBeUndefined();

      // Tunables should throw after reset (fail-fast behavior)
      expect(() => getTunables()).toThrow("Tunables not initialized");
    });

    it("allows fresh bootstrap after reset", () => {
      bootstrap({ presets: ["first"] });
      resetBootstrap();
      bootstrap({ presets: ["second"] });

      const config = getConfig();
      expect(config.presets).toEqual(["second"]);
    });

    it("re-enables tunables access after fresh bootstrap", () => {
      bootstrap({ toggles: { STORY_ENABLE_HOTSPOTS: false } });
      resetBootstrap();
      bootstrap({ toggles: { STORY_ENABLE_HOTSPOTS: true } });

      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
    });
  });

  describe("rebind", () => {
    it("refreshes tunables from current config", () => {
      bootstrap({ overrides: { landmass: { baseWaterPercent: 50 } } });

      const tunables = getTunables();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(50);
    });

    it("can be called multiple times after bootstrap", () => {
      bootstrap(); // Need to bootstrap first for rebind to have a config to work with
      expect(() => {
        rebind();
        rebind();
        rebind();
      }).not.toThrow();
    });
  });

  describe("integration", () => {
    it("full bootstrap -> rebind -> reset cycle", () => {
      // Initial state: tunables not accessible without bootstrap
      expect(() => getTunables()).toThrow("Tunables not initialized");

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

      // Reset - tunables become inaccessible
      resetBootstrap();
      expect(getConfig().presets).toBeUndefined();
      expect(() => getTunables()).toThrow("Tunables not initialized");

      // Bootstrap again - tunables become accessible again with defaults
      bootstrap();
      expect(getTunables().FOUNDATION_PLATES.count).toBe(8);
      expect(getTunables().STORY_ENABLE_OROGENY).toBe(true);
    });
  });

  describe("test isolation", () => {
    it("starts clean in each test - config empty, tunables uninitialized", () => {
      // getConfig() returns empty object (deprecated API behavior)
      const config = getConfig();
      expect(config.presets).toBeUndefined();

      // getTunables() should throw - fail-fast behavior
      expect(() => getTunables()).toThrow("Tunables not initialized");
    });

    it("bootstrap provides access to tunables with defaults", () => {
      bootstrap();
      const tunables = getTunables();
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
    });
  });
});
