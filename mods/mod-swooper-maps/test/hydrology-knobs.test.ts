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
      "map-hydrology": { knobs: {} },
    });

    expect(compiledMissing["hydrology-climate-baseline"]).toEqual(compiledExplicit["hydrology-climate-baseline"]);
    expect(compiledMissing["hydrology-hydrography"]).toEqual(compiledExplicit["hydrology-hydrography"]);
    expect(compiledMissing["hydrology-climate-refine"]).toEqual(compiledExplicit["hydrology-climate-refine"]);
    expect(compiledMissing["map-hydrology"]).toEqual(compiledExplicit["map-hydrology"]);
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

  it("maps riverDensity to monotonic runoff scaling (physics input)", () => {
    const sparse = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "sparse" } } });
    const normal = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "normal" } } });
    const dense = standardRecipe.compileConfig(env, { "hydrology-hydrography": { knobs: { riverDensity: "dense" } } });

    const sparseRunoffScale = sparse["hydrology-hydrography"].rivers.accumulateDischarge.config.runoffScale;
    const normalRunoffScale = normal["hydrology-hydrography"].rivers.accumulateDischarge.config.runoffScale;
    const denseRunoffScale = dense["hydrology-hydrography"].rivers.accumulateDischarge.config.runoffScale;

    expect(denseRunoffScale).toBeGreaterThan(normalRunoffScale);
    expect(normalRunoffScale).toBeGreaterThan(sparseRunoffScale);
  });

  it("allows optional advanced step config in hydrology stages", () => {
    const compiled = standardRecipe.compileConfig(env, {
      "map-hydrology": { lakes: {} },
    });
    expect(compiled["map-hydrology"].lakes.minFillDepthM).toBe(1);
    expect(compiled["map-hydrology"].lakes.evapScale).toBe(1);
    expect(compiled["map-hydrology"].lakes.seepageLoss).toBe(1);
    expect(compiled["map-hydrology"].lakes.seasonalityStrength01).toBe(0.75);
    expect(compiled["map-hydrology"].lakes.permanenceThreshold01).toBe(0.75);
  });

  it("applies knobs as deterministic transforms over advanced config baselines", () => {
    const compiled = standardRecipe.compileConfig(env, {
      "hydrology-climate-baseline": {
        knobs: { dryness: "wet", seasonality: "high", oceanCoupling: "off" },
        "climate-baseline": {
          computePrecipitation: {
            strategy: "default",
            config: {
              rainfallScale: 123,
              humidityExponent: 1,
              noiseAmplitude: 6,
              noiseScale: 0.12,
              waterGradient: {},
              orographic: {},
            },
          },
        },
      },
      "map-hydrology": {
        knobs: { riverDensity: "dense", lakeiness: "many" },
        lakes: { seepageLoss: 2, evapScale: 2, permanenceThreshold01: 0.75 },
        "plot-rivers": { minLength: 11, maxLength: 11 },
      },
      "hydrology-hydrography": {
        knobs: { riverDensity: "dense" },
      },
      "hydrology-climate-refine": {
        knobs: { dryness: "wet", temperature: "hot", cryosphere: "on" },
        "climate-refine": {
          computePrecipitation: {
            strategy: "refine",
            config: {
              riverCorridor: {
                adjacencyRadius: 1,
                lowlandAdjacencyBonus: 44,
                highlandAdjacencyBonus: 10,
                lowlandElevationMax: 250,
              },
              lowBasin: {
                radius: 2,
                delta: 6,
                elevationMax: 200,
                openThresholdM: 20,
              },
            },
          },
        },
      },
    });

    // Baseline values apply first (schema defaults + advanced config), then knobs transform them.
    // - lakeiness=many reduces seepage loss and evap scaling and lowers permanence threshold.
    expect(compiled["map-hydrology"].lakes.seepageLoss).toBeCloseTo(1.7, 6);
    expect(compiled["map-hydrology"].lakes.evapScale).toBeCloseTo(1.9, 6);
    expect(compiled["map-hydrology"].lakes.permanenceThreshold01).toBeCloseTo(0.65, 6);
    // - dryness=wet scales rainfallScale by 1.15 (wetter climate).
    expect(compiled["hydrology-climate-baseline"]["climate-baseline"].computePrecipitation.config.rainfallScale).toBeCloseTo(
      141.45,
      6
    );
    // - riverDensity=dense increases runoffScale in hydrology-hydrography (physics input).
    expect(compiled["hydrology-hydrography"].rivers.accumulateDischarge.config.runoffScale).toBeCloseTo(1.25, 6);
    // Note: engine river modeling bounds remain controlled by the step config (projection-only).
    expect(compiled["map-hydrology"]["plot-rivers"].minLength).toBe(11);
    expect(compiled["map-hydrology"]["plot-rivers"].maxLength).toBe(11);
    expect(
      compiled["hydrology-climate-refine"]["climate-refine"].computePrecipitation.config.riverCorridor
        .lowlandAdjacencyBonus
    ).toBe(51);
  });
});
