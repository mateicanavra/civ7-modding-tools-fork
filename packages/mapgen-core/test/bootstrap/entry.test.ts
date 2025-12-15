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
          climateBaseline: false,
        },
      });
      expect(config.stageConfig?.foundation).toBe(true);
      expect(config.stageConfig?.climateBaseline).toBe(false);
    });

    it("filters invalid preset values", () => {
      const config = bootstrap({
        presets: ["classic", 123 as unknown as string, null as unknown as string, "temperate"],
      });
      expect(config.presets).toEqual(["classic", "temperate"]);
    });
  });

  describe("resetBootstrap", () => {
    it("allows fresh bootstrap after reset", () => {
      bootstrap({ presets: ["classic"] });
      resetBootstrap();
      const config = bootstrap({ presets: ["temperate"] });
      expect(config.presets).toEqual(["temperate"]);
    });
  });
});
