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
} from "@mapgen/bootstrap/entry.js";

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

    it("returns config with overrides", () => {
      const config = bootstrap({
        overrides: {
          foundation: { plates: { count: 12 } },
        },
      });
      expect(config.foundation?.plates?.count).toBe(12);
    });

    it("rejects legacy preset options", () => {
      expect(() =>
        bootstrap({ presets: ["classic"] } as unknown as { presets: string[] })
      ).toThrow("Invalid bootstrap options");
    });
  });

  describe("resetBootstrap", () => {
    it("allows fresh bootstrap after reset", () => {
      bootstrap();
      resetBootstrap();
      const config = bootstrap();
      expect(config.foundation?.plates?.count).toBeDefined();
    });
  });
});
