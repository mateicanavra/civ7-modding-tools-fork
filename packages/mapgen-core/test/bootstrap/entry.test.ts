/**
 * Bootstrap Entry Tests
 *
 * Tests for bootstrap entry.
 * Key acceptance criteria: importing @swooper/mapgen-core/bootstrap does NOT crash without globals.
 */

import { describe, it, expect } from "bun:test";
import {
  bootstrap,
} from "@mapgen/bootstrap/entry.js";

describe("bootstrap/entry", () => {
  describe("import safety", () => {
    it("can be imported without globals available", () => {
      // This test passes if the import at the top of this file succeeded
      expect(bootstrap).toBeDefined();
    });

    it("functions are callable without game engine globals", () => {
      // Should not throw even without RandomImpl, etc.
      expect(() => bootstrap()).not.toThrow();
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
});
