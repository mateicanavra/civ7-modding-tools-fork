import { describe, it, expect } from "bun:test";

import {
  getDefaultConfig,
  getJsonSchema,
  getPublicJsonSchema,
  parseConfig,
  safeParseConfig,
} from "../../src/config/loader.js";
import { INTERNAL_METADATA_KEY } from "../../src/config/schema.js";

describe("config/loader", () => {
  it("returns defaults for empty input", () => {
    const cfg = parseConfig({});

    expect(cfg.landmass?.baseWaterPercent).toBe(60);
    expect(cfg.landmass?.waterScalar).toBe(1);
    expect(cfg.foundation?.plates?.count).toBe(8);
    expect(cfg.foundation?.dynamics?.mantle?.bumps).toBe(4);
  });

  it("throws on out-of-range plate count", () => {
    expect(() => parseConfig({ foundation: { plates: { count: 50 } } })).toThrow("Invalid MapGenConfig");
  });

  it("throws on invalid type", () => {
    expect(() =>
      parseConfig({
        foundation: { plates: { count: "invalid" as unknown as number } },
      })
    ).toThrow("Invalid MapGenConfig");
  });

  it("safeParse reports errors instead of throwing", () => {
    const result = safeParseConfig({ foundation: { plates: { count: "bad" } } });

    expect(result.success).toBe(false);
    expect(result.errors && result.errors.length).toBeGreaterThan(0);
    expect(result.errors?.[0].path).toContain("foundation");
  });

  it("getDefaultConfig returns a validated defaulted config", () => {
    const cfg = getDefaultConfig();
    expect(cfg.foundation?.plates?.count).toBe(8);
    expect(cfg.toggles?.STORY_ENABLE_HOTSPOTS).toBe(true);
  });
});

describe("config/loader public schema guard", () => {
  it("getJsonSchema includes internal fields", () => {
    const schema = getJsonSchema() as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;

    // stageManifest should be present in full schema
    expect(properties.stageManifest).toBeDefined();

    // The stageManifest property should have the xInternal marker
    const stageManifest = properties.stageManifest as Record<string, unknown>;
    expect(stageManifest[INTERNAL_METADATA_KEY]).toBe(true);
  });

  it("getPublicJsonSchema excludes internal fields", () => {
    const schema = getPublicJsonSchema() as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;

    // Internal fields should be removed
    expect(properties.stageManifest).toBeUndefined();
    expect(properties.stageConfig).toBeUndefined();
  });

  it("getPublicJsonSchema preserves public fields", () => {
    const schema = getPublicJsonSchema() as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;

    // Public fields should still be present
    expect(properties.landmass).toBeDefined();
    expect(properties.climate).toBeDefined();
    expect(properties.mountains).toBeDefined();
    expect(properties.toggles).toBeDefined();

    // Verify landmass has nested properties intact
    const landmass = properties.landmass as Record<string, unknown>;
    const landmassProps = landmass.properties as Record<string, unknown>;
    expect(landmassProps?.baseWaterPercent).toBeDefined();
  });

  it("getPublicJsonSchema removes nested internal fields", () => {
    const schema = getPublicJsonSchema() as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;

    // foundation.surface should be filtered (marked internal)
    const foundation = properties.foundation as Record<string, unknown>;
    const foundationProps = foundation?.properties as Record<string, unknown>;

    // surface is internal
    expect(foundationProps?.surface).toBeUndefined();

    // but public foundation fields like plates should remain
    expect(foundationProps?.plates).toBeDefined();
  });
});

describe("config/loader typed climate schemas", () => {
  it("accepts typed climate baseline bands", () => {
    const cfg = parseConfig({
      climate: {
        baseline: {
          bands: {
            deg0to10: 120,
            deg20to35: 70,
          },
          blend: {
            baseWeight: 0.6,
            bandWeight: 0.4,
          },
          orographic: {
            hi1Threshold: 30,
            hi1Bonus: 10,
          },
        },
      },
    });

    expect(cfg.climate?.baseline?.bands?.deg0to10).toBe(120);
    expect(cfg.climate?.baseline?.blend?.baseWeight).toBe(0.6);
    expect(cfg.climate?.baseline?.orographic?.hi1Bonus).toBe(10);
  });

  it("accepts typed climate refine settings", () => {
    const cfg = parseConfig({
      climate: {
        refine: {
          waterGradient: {
            radius: 10,
            perRingBonus: 2,
          },
          orographic: {
            steps: 5,
            reductionBase: 15,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 12,
          },
          lowBasin: {
            radius: 4,
            delta: 20,
          },
        },
      },
    });

    expect(cfg.climate?.refine?.waterGradient?.radius).toBe(10);
    expect(cfg.climate?.refine?.orographic?.steps).toBe(5);
    expect(cfg.climate?.refine?.riverCorridor?.lowlandAdjacencyBonus).toBe(12);
    expect(cfg.climate?.refine?.lowBasin?.delta).toBe(20);
  });

  it("rejects invalid climate blend weight (out of range)", () => {
    expect(() =>
      parseConfig({
        climate: {
          baseline: {
            blend: {
              baseWeight: 1.5, // max is 1
            },
          },
        },
      })
    ).toThrow("Invalid MapGenConfig");
  });
});
