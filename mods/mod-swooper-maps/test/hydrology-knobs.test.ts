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
      "hydrology-pre": { knobs: {} },
      "hydrology-core": { knobs: {} },
      "hydrology-post": { knobs: {} },
    });

    expect(compiledMissing["hydrology-pre"]).toEqual(compiledExplicit["hydrology-pre"]);
    expect(compiledMissing["hydrology-core"]).toEqual(compiledExplicit["hydrology-core"]);
    expect(compiledMissing["hydrology-post"]).toEqual(compiledExplicit["hydrology-post"]);
  });

  it("is deterministic for identical knob inputs", () => {
    const input = {
      "hydrology-pre": { knobs: { dryness: "wet", seasonality: "high", oceanCoupling: "earthlike" } },
      "hydrology-core": { knobs: { riverDensity: "dense" } },
      "hydrology-post": { knobs: { dryness: "wet" } },
    } as const;

    const a = standardRecipe.compileConfig(env, input);
    const b = standardRecipe.compileConfig(env, input);
    expect(a["hydrology-pre"]).toEqual(b["hydrology-pre"]);
    expect(a["hydrology-core"]).toEqual(b["hydrology-core"]);
    expect(a["hydrology-post"]).toEqual(b["hydrology-post"]);
  });

  it("maps dryness to monotonic internal wetness tuning (legacy)", () => {
    const wet = standardRecipe.compileConfig(env, {
      "hydrology-pre": { knobs: { dryness: "wet" } },
      "hydrology-post": { knobs: { dryness: "wet" } },
    });
    const dry = standardRecipe.compileConfig(env, {
      "hydrology-pre": { knobs: { dryness: "dry" } },
      "hydrology-post": { knobs: { dryness: "dry" } },
    });

    const wetScale = wet["hydrology-pre"]["climate-baseline"].computePrecipitation.config.rainfallScale;
    const dryScale = dry["hydrology-pre"]["climate-baseline"].computePrecipitation.config.rainfallScale;
    expect(wetScale).toBeGreaterThan(dryScale);

    const wetRiverBonus =
      wet["hydrology-post"]["climate-refine"].computePrecipitation.config.riverCorridor.lowlandAdjacencyBonus;
    const dryRiverBonus =
      dry["hydrology-post"]["climate-refine"].computePrecipitation.config.riverCorridor.lowlandAdjacencyBonus;
    expect(wetRiverBonus).toBeGreaterThan(dryRiverBonus);
  });

  it("maps riverDensity to monotonic engine river thresholds (legacy)", () => {
    const sparse = standardRecipe.compileConfig(env, { "hydrology-core": { knobs: { riverDensity: "sparse" } } });
    const normal = standardRecipe.compileConfig(env, { "hydrology-core": { knobs: { riverDensity: "normal" } } });
    const dense = standardRecipe.compileConfig(env, { "hydrology-core": { knobs: { riverDensity: "dense" } } });

    expect(sparse["hydrology-core"].rivers.minLength).toBeGreaterThan(normal["hydrology-core"].rivers.minLength);
    expect(normal["hydrology-core"].rivers.minLength).toBeGreaterThan(dense["hydrology-core"].rivers.minLength);
  });

  it("allows optional advanced step config in hydrology stages", () => {
    const compiled = standardRecipe.compileConfig(env, {
      "hydrology-pre": { lakes: {} },
    });
    expect(compiled["hydrology-pre"].lakes.tilesPerLakeMultiplier).toBe(1);
  });
});
