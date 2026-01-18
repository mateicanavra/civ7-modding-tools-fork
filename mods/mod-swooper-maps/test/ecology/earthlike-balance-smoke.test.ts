import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { ecologyArtifacts } from "../../src/recipes/standard/stages/ecology/artifacts.js";
import { BIOME_SYMBOL_TO_INDEX } from "@mapgen/domain/ecology/types.js";
import { swooperEarthlikeConfig } from "../../src/maps/presets/swooper-earthlike.config.js";

describe("Earthlike ecology balance (smoke)", () => {
  it("has desert/boreal presence and non-zero vegetation without drowning coasts", () => {
    const width = 32;
    const height = 20;
    const seed = 12345;

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

    const adapter = createMockAdapter({
      width,
      height,
      mapInfo,
      mapSizeId: 1,
      rng: createLabelRng(seed),
    });

    const context = createExtendedMapContext({ width, height }, adapter, env);
    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

    standardRecipe.run(context, env, swooperEarthlikeConfig, { log: () => {} });

    const classification = context.artifacts.get(ecologyArtifacts.biomeClassification.id) as
      | { biomeIndex?: Uint8Array }
      | undefined;
    const biomeIndex = classification?.biomeIndex;
    if (!(biomeIndex instanceof Uint8Array)) throw new Error("Missing biomeIndex.");

    let landCount = 0;
    let desertBiomeCount = 0;
    let borealBiomeCount = 0;
    let temperateDryBiomeCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        landCount++;
        const idx = y * width + x;
        const biome = biomeIndex[idx] ?? 255;
        if (biome === BIOME_SYMBOL_TO_INDEX.desert) desertBiomeCount++;
        if (biome === BIOME_SYMBOL_TO_INDEX.boreal) borealBiomeCount++;
        if (biome === BIOME_SYMBOL_TO_INDEX.temperateDry) temperateDryBiomeCount++;
      }
    }

    const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
    const rainforestIdx = adapter.getFeatureTypeIndex("FEATURE_RAINFOREST");
    const taigaIdx = adapter.getFeatureTypeIndex("FEATURE_TAIGA");
    const savannaIdx = adapter.getFeatureTypeIndex("FEATURE_SAVANNA_WOODLAND");
    const steppeIdx = adapter.getFeatureTypeIndex("FEATURE_SAGEBRUSH_STEPPE");
    const marshIdx = adapter.getFeatureTypeIndex("FEATURE_MARSH");
    const bogIdx = adapter.getFeatureTypeIndex("FEATURE_TUNDRA_BOG");
    const mangroveIdx = adapter.getFeatureTypeIndex("FEATURE_MANGROVE");

    let forestCount = 0;
    let rainforestCount = 0;
    let taigaCount = 0;
    let savannaCount = 0;
    let steppeCount = 0;
    let wetlandCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const feature = adapter.getFeatureType(x, y);
        if (feature === forestIdx) forestCount++;
        if (feature === rainforestIdx) rainforestCount++;
        if (feature === taigaIdx) taigaCount++;
        if (feature === savannaIdx) savannaCount++;
        if (feature === steppeIdx) steppeCount++;
        if (feature === marshIdx || feature === bogIdx || feature === mangroveIdx) wetlandCount++;
      }
    }

    expect(landCount).toBeGreaterThan(0);

    expect(desertBiomeCount).toBeGreaterThan(0);
    expect(borealBiomeCount).toBeGreaterThan(0);
    expect(temperateDryBiomeCount).toBeGreaterThan(0);

    expect(forestCount + rainforestCount).toBeGreaterThan(0);
    expect(taigaCount).toBeGreaterThan(0);
    expect(savannaCount).toBeGreaterThan(0);
    expect(steppeCount).toBeGreaterThan(0);

    expect(wetlandCount).toBeLessThan(Math.max(1, Math.floor(landCount * 0.2)));
  });
});
