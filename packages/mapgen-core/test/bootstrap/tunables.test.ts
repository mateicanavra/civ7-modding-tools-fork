/**
 * Bootstrap Tunables Tests
 *
 * Tests for getTunables/resetTunables/stageEnabled functions.
 *
 * Note: These tests use the canonical flow: bootstrap() or bindTunables() to
 * set up config, then getTunables() to read tunables.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { parseConfig } from "../../src/config/index.js";
import type { MapGenConfig } from "../../src/config/index.js";
import {
  getTunables,
  resetTunables,
  resetTunablesForTest,
  bindTunables,
  stageEnabled,
  TUNABLES,
} from "../../src/bootstrap/tunables.js";

/**
 * Helper to create a minimal valid MapGenConfig from partial overrides.
 * Uses parseConfig to apply defaults and validate.
 */
function createConfig(overrides: Partial<MapGenConfig> = {}): MapGenConfig {
  return parseConfig(overrides);
}

describe("bootstrap/tunables", () => {
  beforeEach(() => {
    resetTunablesForTest(); // Use full reset for test isolation
  });

  describe("getTunables", () => {
    it("throws if called before bindTunables", () => {
      expect(() => getTunables()).toThrow("Tunables not initialized");
    });

    it("returns tunables after bindTunables with default config", () => {
      bindTunables(createConfig());
      const tunables = getTunables();

      expect(tunables).toBeDefined();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
      expect(tunables.STORY_ENABLE_RIFTS).toBe(true);
      expect(tunables.STORY_ENABLE_OROGENY).toBe(true);
      expect(tunables.STORY_ENABLE_SWATCHES).toBe(true);
      expect(tunables.STORY_ENABLE_PALEO).toBe(true);
      expect(tunables.STORY_ENABLE_CORRIDORS).toBe(true);
    });

    it("returns cached value on repeated calls", () => {
      bindTunables(createConfig());
      const tunables1 = getTunables();
      const tunables2 = getTunables();
      expect(tunables1).toBe(tunables2);
    });

    it("includes default foundation plates config", () => {
      bindTunables(createConfig());
      const tunables = getTunables();

      expect(tunables.FOUNDATION_PLATES).toBeDefined();
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
      expect(tunables.FOUNDATION_PLATES.relaxationSteps).toBe(5);
      expect(tunables.FOUNDATION_PLATES.convergenceMix).toBe(0.5);
      expect(tunables.FOUNDATION_PLATES.plateRotationMultiple).toBe(1.0);
      expect(tunables.FOUNDATION_PLATES.seedMode).toBe("engine");
    });

    it("includes default foundation dynamics config", () => {
      bindTunables(createConfig());
      const tunables = getTunables();

      expect(tunables.FOUNDATION_DYNAMICS).toBeDefined();
      expect(tunables.FOUNDATION_DYNAMICS.mantle?.bumps).toBe(4);
      expect(tunables.FOUNDATION_DYNAMICS.wind?.jetStreaks).toBe(3);
    });

    it("includes default landmass config", () => {
      bindTunables(createConfig());
      const tunables = getTunables();

      expect(tunables.LANDMASS_CFG).toBeDefined();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(60);
    });
  });

  describe("config overrides", () => {
    it("respects toggle overrides", () => {
      bindTunables(createConfig({ toggles: { STORY_ENABLE_HOTSPOTS: false } }));

      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(false);
      expect(tunables.STORY_ENABLE_RIFTS).toBe(true); // default
    });

    it("merges foundation plates config", () => {
      bindTunables(createConfig({ foundation: { plates: { count: 12 } } }));

      const tunables = getTunables();
      expect(tunables.FOUNDATION_PLATES.count).toBe(12);
      expect(tunables.FOUNDATION_PLATES.relaxationSteps).toBe(5); // default preserved
    });

    it("merges foundation dynamics config", () => {
      bindTunables(
        createConfig({
          foundation: {
            dynamics: {
              mantle: { bumps: 6 },
            },
          },
        })
      );

      const tunables = getTunables();
      expect(tunables.FOUNDATION_DYNAMICS.mantle?.bumps).toBe(6);
      expect(tunables.FOUNDATION_DYNAMICS.wind?.jetStreaks).toBe(3); // default
    });

    it("merges landmass config", () => {
      bindTunables(createConfig({ landmass: { baseWaterPercent: 75 } }));

      const tunables = getTunables();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(75);
    });
  });

  describe("resetTunables", () => {
    it("clears the cached tunables but keeps bound config", () => {
      bindTunables(createConfig());
      const tunables1 = getTunables();
      resetTunables();
      const tunables2 = getTunables();

      // Should get a fresh instance (not cached)
      expect(tunables1).not.toBe(tunables2);
      // But values should be the same since config is still bound
      expect(tunables2.FOUNDATION_PLATES.count).toBe(8);
    });

    it("allows rebinding new config after reset", () => {
      bindTunables(createConfig({ foundation: { plates: { count: 10 } } }));
      getTunables(); // Cache with old config

      // Bind new config and reset cache
      bindTunables(createConfig({ foundation: { plates: { count: 16 } } }));

      const tunables = getTunables();
      expect(tunables.FOUNDATION_PLATES.count).toBe(16);
    });
  });

  describe("resetTunablesForTest", () => {
    it("clears both cache and bound config", () => {
      bindTunables(createConfig());
      getTunables(); // Ensure cached

      resetTunablesForTest();

      // Should throw because bound config was cleared
      expect(() => getTunables()).toThrow("Tunables not initialized");
    });
  });

  describe("stageEnabled", () => {
    it("returns false for unknown stages", () => {
      bindTunables(createConfig());
      expect(stageEnabled("unknown_stage")).toBe(false);
    });

    it("returns true for enabled stages in manifest", () => {
      bindTunables(
        createConfig({
          stageManifest: {
            order: ["foundation", "climate"],
            stages: {
              foundation: { enabled: true },
              climate: { enabled: true },
            },
          },
        })
      );

      expect(stageEnabled("foundation")).toBe(true);
      expect(stageEnabled("climate")).toBe(true);
    });

    it("returns false for disabled stages in manifest", () => {
      bindTunables(
        createConfig({
          stageManifest: {
            order: ["foundation"],
            stages: {
              foundation: { enabled: false },
            },
          },
        })
      );

      expect(stageEnabled("foundation")).toBe(false);
    });
  });

  describe("TUNABLES proxy object", () => {
    it("provides live access to current tunables", () => {
      bindTunables(createConfig());
      expect(TUNABLES.STORY_ENABLE_HOTSPOTS).toBe(true);

      bindTunables(createConfig({ toggles: { STORY_ENABLE_HOTSPOTS: false } }));
      expect(TUNABLES.STORY_ENABLE_HOTSPOTS).toBe(false);
    });

    it("reflects reset state after resetTunablesForTest", () => {
      bindTunables(createConfig({ toggles: { STORY_ENABLE_RIFTS: false } }));
      expect(TUNABLES.STORY_ENABLE_RIFTS).toBe(false);

      resetTunablesForTest();

      // TUNABLES proxy will throw when accessed without bound config
      expect(() => TUNABLES.STORY_ENABLE_RIFTS).toThrow("Tunables not initialized");
    });
  });

  describe("isolation", () => {
    it("does not leak state between tests", () => {
      // After beforeEach reset, should throw
      expect(() => getTunables()).toThrow("Tunables not initialized");

      // Bind config for this test
      bindTunables(createConfig());
      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
    });
  });
});
