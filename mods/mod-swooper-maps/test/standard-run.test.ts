import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";

import standardRecipe from "../src/recipes/standard/recipe.js";
import { buildStandardRecipeConfig } from "../src/maps/_runtime/standard-config.js";
import { initializeStandardRuntime } from "../src/recipes/standard/runtime.js";
import { M3_DEPENDENCY_TAGS } from "../src/recipes/standard/tags.js";

describe("standard recipe execution", () => {
  it("compiles and executes with a mock adapter", () => {
    const width = 24;
    const height = 18;
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

    const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1 });
    const context = createExtendedMapContext(
      { width, height },
      adapter,
      {} as ReturnType<typeof createExtendedMapContext>["config"]
    );

    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

    const settings = {
      seed: 123,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
      wrap: { wrapX: true, wrapY: false },
      directionality: {},
    };

    const config = buildStandardRecipeConfig({});
    const plan = standardRecipe.compile(settings, config);
    expect(plan.nodes.length).toBeGreaterThan(0);

    expect(() =>
      standardRecipe.run(context, settings, config, { log: () => {} })
    ).not.toThrow();

    const climateField = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.climateField) as
      | { humidity?: Uint8Array }
      | undefined;
    const humidity = climateField?.humidity;
    expect(humidity instanceof Uint8Array).toBe(true);
    expect(humidity?.length).toBe(width * height);
    expect(humidity?.some((value) => value > 0)).toBe(true);

    expect(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1)).toBeTruthy();
    expect(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1)).toBeTruthy();
  });
});
