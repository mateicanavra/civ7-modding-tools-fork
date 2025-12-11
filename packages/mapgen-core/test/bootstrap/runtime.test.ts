/**
 * Bootstrap Runtime Tests
 *
 * Tests for setConfig/getConfig/resetConfig functions.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { setConfig, getConfig, resetConfig } from "../../src/bootstrap/runtime.js";
import type { MapConfig } from "../../src/bootstrap/types.js";

describe("bootstrap/runtime", () => {
  beforeEach(() => {
    resetConfig();
  });

  describe("getConfig", () => {
    it("returns empty object by default", () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });

    it("returns equivalent objects on repeated calls", () => {
      // Note: getConfig() is deprecated. When no config is set,
      // it returns a new empty object each time (not referentially equal).
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toEqual(config2);
    });
  });

  describe("setConfig", () => {
    it("sets config that can be retrieved", () => {
      const testConfig: MapConfig = {
        presets: ["classic"],
        toggles: { STORY_ENABLE_HOTSPOTS: false },
      };

      setConfig(testConfig);
      const config = getConfig();

      expect(config.presets).toEqual(["classic"]);
      expect(config.toggles?.STORY_ENABLE_HOTSPOTS).toBe(false);
    });

    it("replaces previous config entirely", () => {
      setConfig({ presets: ["first"] });
      setConfig({ presets: ["second"] });

      const config = getConfig();
      expect(config.presets).toEqual(["second"]);
    });

    it("accepts partial config", () => {
      setConfig({ landmass: { baseWaterPercent: 70 } });
      const config = getConfig();
      expect(config.landmass?.baseWaterPercent).toBe(70);
    });
  });

  describe("resetConfig", () => {
    it("resets config to empty state", () => {
      setConfig({ presets: ["test"] });
      resetConfig();
      const config = getConfig();
      expect(config.presets).toBeUndefined();
    });

    it("allows new config after reset", () => {
      setConfig({ presets: ["first"] });
      resetConfig();
      setConfig({ presets: ["second"] });
      const config = getConfig();
      expect(config.presets).toEqual(["second"]);
    });
  });

  describe("isolation", () => {
    it("does not share state between resets", () => {
      setConfig({ toggles: { STORY_ENABLE_RIFTS: false } });
      const config1 = getConfig();

      resetConfig();
      const config2 = getConfig();

      expect(config1.toggles?.STORY_ENABLE_RIFTS).toBe(false);
      expect(config2.toggles).toBeUndefined();
    });
  });
});
