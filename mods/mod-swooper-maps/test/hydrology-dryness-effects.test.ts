import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../src/recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../src/recipes/standard/runtime.js";
import { hydrologyClimateBaselineArtifacts } from "../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../src/recipes/standard/stages/hydrology-climate-refine/artifacts.js";

describe("hydrology dryness knob effects (integration)", () => {
  it("yields wetter climate signals for wet vs dry (same seed)", () => {
    const width = 24;
    const height = 18;
    const seed = 123;

    const mapInfo = {
      GridWidth: width,
      GridHeight: height,
      MinLatitude: -60,
      MaxLatitude: 60,
      PlayersLandmass1: 4,
      PlayersLandmass2: 4,
      StartSectorRows: 4,
      StartSectorCols: 4,
    };
    const env = {
      seed,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
    };

    const runAndMeans = (dryness: "dry" | "wet") => {
      const config: StandardRecipeConfig = {
        "hydrology-climate-baseline": { knobs: { dryness } },
        "hydrology-climate-refine": { knobs: { dryness } },
      };
      const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1, rng: createLabelRng(seed) });
      const context = createExtendedMapContext({ width, height }, adapter, env);
      initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

      standardRecipe.run(context, env, config, { log: () => {} });

      const climateField = context.artifacts.get(hydrologyClimateBaselineArtifacts.climateField.id) as
        | { rainfall?: Uint8Array; humidity?: Uint8Array }
        | undefined;
      const rainfall = climateField?.rainfall;
      const humidity = climateField?.humidity;
      if (!(rainfall instanceof Uint8Array) || !(humidity instanceof Uint8Array)) {
        throw new Error("Missing rainfall/humidity artifacts.");
      }

      const indices = context.artifacts.get(hydrologyClimateRefineArtifacts.climateIndices.id) as
        | { aridityIndex?: Float32Array }
        | undefined;
      const aridity = indices?.aridityIndex;
      if (!(aridity instanceof Float32Array)) throw new Error("Missing aridityIndex.");

      let rainfallSum = 0;
      let humiditySum = 0;
      let ariditySum = 0;
      for (let i = 0; i < rainfall.length; i++) {
        rainfallSum += rainfall[i] ?? 0;
        humiditySum += humidity[i] ?? 0;
        ariditySum += aridity[i] ?? 0;
      }
      const denom = Math.max(1, rainfall.length);
      return {
        meanRainfall: rainfallSum / denom,
        meanHumidity: humiditySum / denom,
        meanAridity: ariditySum / denom,
      };
    };

    const dry = runAndMeans("dry");
    const wet = runAndMeans("wet");

    expect(wet.meanRainfall).toBeGreaterThan(dry.meanRainfall);
    expect(wet.meanHumidity).toBeGreaterThan(dry.meanHumidity);
    expect(dry.meanAridity).toBeGreaterThan(wet.meanAridity);
  });
});
