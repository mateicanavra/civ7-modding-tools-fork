import { describe, expect, it } from "bun:test";

import standardRecipe from "../src/recipes/standard/recipe.js";

const env = {
  seed: 123,
  dimensions: { width: 12, height: 9 },
  latitudeBounds: { topLatitude: 60, bottomLatitude: -60 },
};

describe("hydrology knobs compilation", () => {
  it("treats missing knobs the same as explicit empty knobs objects", () => {
    const compiledMissing = standardRecipe.compileConfig(env, {});
    const compiledExplicit = standardRecipe.compileConfig(env, {
      "hydrology-climate-baseline": { knobs: {} },
      "hydrology-hydrography": { knobs: {} },
      "hydrology-climate-refine": { knobs: {} },
    });

    expect(compiledMissing["hydrology-climate-baseline"]).toEqual(compiledExplicit["hydrology-climate-baseline"]);
    expect(compiledMissing["hydrology-hydrography"]).toEqual(compiledExplicit["hydrology-hydrography"]);
    expect(compiledMissing["hydrology-climate-refine"]).toEqual(compiledExplicit["hydrology-climate-refine"]);
  });

  it("is deterministic for identical knob inputs", () => {
    const input = {
      "hydrology-climate-baseline": { knobs: { dryness: "wet", seasonality: "high", oceanCoupling: "earthlike" } },
      "hydrology-hydrography": { knobs: { riverDensity: "dense" } },
      "hydrology-climate-refine": { knobs: { dryness: "wet" } },
    } as const;

    const a = standardRecipe.compileConfig(env, input);
    const b = standardRecipe.compileConfig(env, input);
    expect(a["hydrology-climate-baseline"]).toEqual(b["hydrology-climate-baseline"]);
    expect(a["hydrology-hydrography"]).toEqual(b["hydrology-hydrography"]);
    expect(a["hydrology-climate-refine"]).toEqual(b["hydrology-climate-refine"]);
  });

  it("maps dryness to monotonic internal wetness tuning (legacy)", () => {
    const wet = standardRecipe.compileConfig(env, {
      "hydrology-climate-baseline": { knobs: { dryness: "wet" } },
      "hydrology-climate-refine": { knobs: { dryness: "wet" } },
    });
    const dry = standardRecipe.compileConfig(env, {
      "hydrology-climate-baseline": { knobs: { dryness: "dry" } },
      "hydrology-climate-refine": { knobs: { dryness: "dry" } },
    });

    const wetScale = wet["hydrology-climate-baseline"]["climate-baseline"].computePrecipitation.config.rainfallScale;
    const dryScale = dry["hydrology-climate-baseline"]["climate-baseline"].computePrecipitation.config.rainfallScale;
    expect(wetScale).toBeGreaterThan(dryScale);

    const wetRiverBonus =
      wet["hydrology-climate-refine"]["climate-refine"].computePrecipitation.config.riverCorridor.lowlandAdjacencyBonus;
    const dryRiverBonus =
      dry["hydrology-climate-refine"]["climate-refine"].computePrecipitation.config.riverCorridor.lowlandAdjacencyBonus;
    expect(wetRiverBonus).toBeGreaterThan(dryRiverBonus);
  });

  it("maps riverDensity to monotonic engine river thresholds (legacy)", () => {
    const sparse = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "sparse" } } });
    const normal = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "normal" } } });
    const dense = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "dense" } } });

    expect(sparse["hydrology-hydrography"].rivers.minLength).toBeGreaterThan(normal["hydrology-hydrography"].rivers.minLength);
    expect(normal["hydrology-hydrography"].rivers.minLength).toBeGreaterThan(dense["hydrology-hydrography"].rivers.minLength);
  });

  it("allows optional advanced step config in hydrology stages", () => {
    const compiled = standardRecipe.compileConfig(env, {
      "hydrology-climate-baseline": { lakes: {} },
    });
    expect(compiled["hydrology-climate-baseline"].lakes.tilesPerLakeMultiplier).toBe(1);
  });
});
