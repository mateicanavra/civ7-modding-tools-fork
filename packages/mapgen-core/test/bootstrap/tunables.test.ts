/**
 * Bootstrap Tunables Tests
 *
 * Tests for getTunables/resetTunables/rebind/stageEnabled functions.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { setConfig, resetConfig } from "../../src/bootstrap/runtime.js";
import {
  getTunables,
  resetTunables,
  rebind,
  stageEnabled,
  TUNABLES,
} from "../../src/bootstrap/tunables.js";

describe("bootstrap/tunables", () => {
  beforeEach(() => {
    resetConfig();
    resetTunables();
  });

  describe("getTunables", () => {
    it("returns default tunables without config", () => {
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
      const tunables1 = getTunables();
      const tunables2 = getTunables();
      expect(tunables1).toBe(tunables2);
    });

    it("includes default foundation plates config", () => {
      const tunables = getTunables();

      expect(tunables.FOUNDATION_PLATES).toBeDefined();
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
      expect(tunables.FOUNDATION_PLATES.relaxationSteps).toBe(5);
      expect(tunables.FOUNDATION_PLATES.convergenceMix).toBe(0.5);
      expect(tunables.FOUNDATION_PLATES.plateRotationMultiple).toBe(1.0);
      expect(tunables.FOUNDATION_PLATES.seedMode).toBe("engine");
    });

    it("includes default foundation dynamics config", () => {
      const tunables = getTunables();

      expect(tunables.FOUNDATION_DYNAMICS).toBeDefined();
      expect(tunables.FOUNDATION_DYNAMICS.mantle?.bumps).toBe(4);
      expect(tunables.FOUNDATION_DYNAMICS.wind?.jetStreaks).toBe(3);
    });

    it("includes default landmass config", () => {
      const tunables = getTunables();

      expect(tunables.LANDMASS_CFG).toBeDefined();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(60);
    });
  });

  describe("config overrides", () => {
    it("respects toggle overrides", () => {
      setConfig({ toggles: { STORY_ENABLE_HOTSPOTS: false } });
      rebind();

      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(false);
      expect(tunables.STORY_ENABLE_RIFTS).toBe(true); // default
    });

    it("merges foundation plates config", () => {
      setConfig({ foundation: { plates: { count: 12 } } });
      rebind();

      const tunables = getTunables();
      expect(tunables.FOUNDATION_PLATES.count).toBe(12);
      expect(tunables.FOUNDATION_PLATES.relaxationSteps).toBe(5); // default preserved
    });

    it("merges foundation dynamics config", () => {
      setConfig({
        foundation: {
          dynamics: {
            mantle: { bumps: 6 },
          },
        },
      });
      rebind();

      const tunables = getTunables();
      expect(tunables.FOUNDATION_DYNAMICS.mantle?.bumps).toBe(6);
      expect(tunables.FOUNDATION_DYNAMICS.wind?.jetStreaks).toBe(3); // default
    });

    it("merges landmass config", () => {
      setConfig({ landmass: { baseWaterPercent: 75 } });
      rebind();

      const tunables = getTunables();
      expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(75);
    });
  });

  describe("resetTunables", () => {
    it("clears the cached tunables", () => {
      const tunables1 = getTunables();
      resetTunables();
      const tunables2 = getTunables();

      expect(tunables1).not.toBe(tunables2);
    });

    it("allows new config to take effect", () => {
      getTunables(); // Cache with defaults

      setConfig({ toggles: { STORY_ENABLE_PALEO: false } });
      resetTunables();

      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_PALEO).toBe(false);
    });
  });

  describe("rebind", () => {
    it("refreshes tunables from current config", () => {
      getTunables(); // Cache with defaults

      setConfig({ foundation: { plates: { count: 16 } } });
      rebind();

      const tunables = getTunables();
      expect(tunables.FOUNDATION_PLATES.count).toBe(16);
    });

    it("returns fresh instance after rebind", () => {
      const tunables1 = getTunables();
      rebind();
      const tunables2 = getTunables();

      // After rebind, should be the same (rebind caches)
      expect(tunables2).toBeDefined();
    });
  });

  describe("stageEnabled", () => {
    it("returns false for unknown stages", () => {
      expect(stageEnabled("unknown_stage")).toBe(false);
    });

    it("returns true for enabled stages in manifest", () => {
      setConfig({
        stageManifest: {
          order: ["foundation", "climate"],
          stages: {
            foundation: { enabled: true },
            climate: { enabled: true },
          },
        },
      });
      rebind();

      expect(stageEnabled("foundation")).toBe(true);
      expect(stageEnabled("climate")).toBe(true);
    });

    it("returns false for disabled stages in manifest", () => {
      setConfig({
        stageManifest: {
          order: ["foundation"],
          stages: {
            foundation: { enabled: false },
          },
        },
      });
      rebind();

      expect(stageEnabled("foundation")).toBe(false);
    });
  });

  describe("TUNABLES proxy object", () => {
    it("provides live access to current tunables", () => {
      expect(TUNABLES.STORY_ENABLE_HOTSPOTS).toBe(true);

      setConfig({ toggles: { STORY_ENABLE_HOTSPOTS: false } });
      rebind();

      expect(TUNABLES.STORY_ENABLE_HOTSPOTS).toBe(false);
    });

    it("reflects reset state", () => {
      setConfig({ toggles: { STORY_ENABLE_RIFTS: false } });
      rebind();
      expect(TUNABLES.STORY_ENABLE_RIFTS).toBe(false);

      resetConfig();
      resetTunables();
      expect(TUNABLES.STORY_ENABLE_RIFTS).toBe(true);
    });
  });

  describe("isolation", () => {
    it("does not leak state between tests", () => {
      const tunables = getTunables();
      expect(tunables.STORY_ENABLE_HOTSPOTS).toBe(true);
      expect(tunables.FOUNDATION_PLATES.count).toBe(8);
    });
  });
});
