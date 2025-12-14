/**
 * Bootstrap Entry Tests
 *
 * Tests for bootstrap/resetBootstrap functions.
 * Key acceptance criteria: importing @swooper/mapgen-core/bootstrap does NOT crash without globals.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  bootstrap,
  resetBootstrap,
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
    });

    it("functions are callable without game engine globals", () => {
      // Should not throw even without RandomImpl, etc.
      expect(() => bootstrap()).not.toThrow();
      expect(() => resetBootstrap()).not.toThrow();
    });
  });

  describe("bootstrap", () => {
    it("accepts empty options", () => {
      expect(() => bootstrap()).not.toThrow();
      expect(() => bootstrap({})).not.toThrow();
    });

    it("returns config with presets", () => {
      const config = bootstrap({ presets: ["classic", "temperate"] });
      expect(config.presets).toEqual(["classic", "temperate"]);
    });

    it("applies preset config before overrides", () => {
      const config = bootstrap({ presets: ["temperate"] });
      expect(config.foundation?.dynamics?.directionality?.cohesion).toBe(0.6);

      const overridden = bootstrap({
        presets: ["temperate"],
        overrides: { foundation: { dynamics: { directionality: { cohesion: 0.2 } } } },
      });
      expect(overridden.foundation?.dynamics?.directionality?.cohesion).toBe(0.2);
    });

    it("returns config with overrides", () => {
      const config = bootstrap({
        overrides: {
          foundation: { plates: { count: 12 } },
        },
      });
      expect(config.foundation?.plates?.count).toBe(12);
    });

    it("returns config with stageConfig", () => {
      const config = bootstrap({
        stageConfig: {
          foundation: true,
          climate: false,
        },
      });
      expect(config.stageConfig?.foundation).toBe(true);
      expect(config.stageConfig?.climate).toBe(false);
    });

    it("triggers tunables binding", () => {
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
      const config = bootstrap({
        presets: ["classic", 123 as unknown as string, null as unknown as string, "temperate"],
      });
      expect(config.presets).toEqual(["classic", "temperate"]);
    });
  });

  describe("resetBootstrap", () => {
    it("resets config and makes tunables inaccessible", () => {
      bootstrap({
        presets: ["classic"],
        overrides: { toggles: { STORY_ENABLE_HOTSPOTS: false } },
      });

      resetBootstrap();

      // Tunables should throw after reset (fail-fast behavior)
      expect(() => getTunables()).toThrow("Tunables not initialized");
    });

    it("allows fresh bootstrap after reset", () => {
      bootstrap({ presets: ["classic"] });
      resetBootstrap();
      const config = bootstrap({ presets: ["temperate"] });
      expect(config.presets).toEqual(["temperate"]);
    });

    it("re-enables tunables access after fresh bootstrap", () => {
      bootstrap({ toggles: { STORY_ENABLE_HOTSPOTS: false } });
      resetBootstrap();
      bootstrap({ toggles: { STORY_ENABLE_HOTSPOTS: true } });

      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
    });
  });

  describe("integration", () => {
    it("full bootstrap -> reset cycle", () => {
      // Initial state: tunables not accessible without bootstrap
      expect(() => getTunables()).toThrow("Tunables not initialized");

      // Bootstrap with overrides
      const config = bootstrap({
        presets: ["classic"],
        overrides: {
          foundation: { plates: { count: 10 } },
          toggles: { STORY_ENABLE_OROGENY: false },
        },
      });

      expect(config.presets).toEqual(["classic"]);
      expect(getTunables().FOUNDATION_PLATES.count).toBe(10);
      expect(getTunables().STORY_ENABLE_OROGENY).toBe(false);

      // Reset - tunables become inaccessible
      resetBootstrap();
      expect(() => getTunables()).toThrow("Tunables not initialized");

      // Bootstrap again - tunables become accessible again with defaults
      bootstrap();
      expect(getTunables().FOUNDATION_PLATES.count).toBe(8);
      expect(getTunables().STORY_ENABLE_OROGENY).toBe(true);
    });
  });

  describe("test isolation", () => {
    it("starts clean in each test - tunables uninitialized", () => {
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
