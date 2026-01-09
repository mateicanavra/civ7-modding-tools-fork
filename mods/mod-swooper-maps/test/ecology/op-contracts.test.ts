import { describe, expect, it } from "bun:test";

import * as ecology from "../../src/domain/ecology/index.js";
import { BIOME_SYMBOL_TO_INDEX } from "../../src/domain/ecology/types.js";

import { disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

const createFeatureKeyField = (size: number) => new Int16Array(size).fill(-1);

describe("ecology op contract surfaces", () => {
  it("classifyBiomes validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;

    const result = ecology.ops.classifyBiomes.runValidated(
      {
        width,
        height,
        rainfall: new Uint8Array(size).fill(160),
        humidity: new Uint8Array(size).fill(120),
        elevation: new Int16Array(size).fill(400),
        latitude: new Float32Array(size).fill(20),
        landMask: new Uint8Array(size).fill(1),
        corridorMask: new Uint8Array(size).fill(0),
        riftShoulderMask: new Uint8Array(size).fill(0),
      },
      ecology.ops.classifyBiomes.defaultConfig,
      { validateOutput: true }
    );

    expect(result.biomeIndex.length).toBe(size);
    expect(result.vegetationDensity.length).toBe(size);
  });

  it("planVegetatedFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;

    const result = ecology.ops.planVegetatedFeaturePlacements.runValidated(
      {
        width,
        height,
        seed: 0,
        biomeIndex: new Uint8Array(size).fill(temperateHumid),
        vegetationDensity: new Float32Array(size).fill(1),
        effectiveMoisture: new Float32Array(size).fill(200),
        surfaceTemperature: new Float32Array(size).fill(18),
        aridityIndex: new Float32Array(size).fill(0.2),
        freezeIndex: new Float32Array(size).fill(0),
        landMask: new Uint8Array(size).fill(1),
        terrainType: new Uint8Array(size).fill(0),
        featureKeyField: createFeatureKeyField(size),
        navigableRiverTerrain: 255,
      },
      {
        strategy: "default",
        config: { chances: { FEATURE_FOREST: 100 }, rules: { vegetationChanceScalar: 1 } },
      },
      { validateOutput: true }
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_FOREST");
  });

  it("planWetFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;

    const result = ecology.ops.planWetFeaturePlacements.runValidated(
      {
        width,
        height,
        seed: 0,
        biomeIndex: new Uint8Array(size).fill(temperateHumid),
        surfaceTemperature: new Float32Array(size).fill(12),
        landMask: new Uint8Array(size).fill(1),
        terrainType: new Uint8Array(size).fill(0),
        featureKeyField: createFeatureKeyField(size),
        nearRiverMask: new Uint8Array(size).fill(1),
        isolatedRiverMask: new Uint8Array(size).fill(0),
        navigableRiverTerrain: 255,
      },
      { strategy: "default", config: { chances: { FEATURE_MARSH: 100 } } },
      { validateOutput: true }
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_MARSH");
  });

  it("planAquaticFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;

    const result = ecology.ops.planAquaticFeaturePlacements.runValidated(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(0),
        terrainType: new Uint8Array(size).fill(0),
        latitude: new Float32Array(size).fill(0),
        featureKeyField: createFeatureKeyField(size),
        coastTerrain: 1,
      },
      { strategy: "default", config: { chances: { FEATURE_REEF: 100 }, rules: { reefLatitudeSplit: 90 } } },
      { validateOutput: true }
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_REEF");
  });

  it("planIceFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;

    const result = ecology.ops.planIceFeaturePlacements.runValidated(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(0),
        latitude: new Float32Array(size).fill(80),
        featureKeyField: createFeatureKeyField(size),
        naturalWonderMask: new Uint8Array(size).fill(0),
      },
      {
        strategy: "default",
        config: {
          chances: { FEATURE_ICE: 100 },
          rules: {
            minAbsLatitude: 0,
            forbidAdjacentToLand: false,
            forbidAdjacentToNaturalWonders: false,
          },
        },
      },
      { validateOutput: true }
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_ICE");
  });

  it("planReefEmbellishments validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;

    const result = ecology.ops.planReefEmbellishments.runValidated(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(0),
        featureKeyField: createFeatureKeyField(size),
        paradiseMask: new Uint8Array(size).fill(0),
        passiveShelfMask: new Uint8Array(size).fill(0),
      },
      { strategy: "default", config: disabledEmbellishmentsConfig },
      { validateOutput: true }
    );

    expect(Array.isArray(result.placements)).toBe(true);
  });

  it("planVegetationEmbellishments validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;

    const result = ecology.ops.planVegetationEmbellishments.runValidated(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(1),
        terrainType: new Uint8Array(size).fill(0),
        biomeIndex: new Uint8Array(size).fill(temperateHumid),
        featureKeyField: createFeatureKeyField(size),
        rainfall: new Uint8Array(size).fill(120),
        vegetationDensity: new Float32Array(size).fill(0.2),
        elevation: new Int16Array(size).fill(0),
        latitude: new Float32Array(size).fill(10),
        volcanicMask: new Uint8Array(size).fill(0),
        navigableRiverTerrain: 255,
      },
      { strategy: "default", config: disabledEmbellishmentsConfig },
      { validateOutput: true }
    );

    expect(Array.isArray(result.placements)).toBe(true);
  });

  it("planPlotEffects validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const tundra = BIOME_SYMBOL_TO_INDEX.tundra ?? 1;

    const result = ecology.ops.planPlotEffects.runValidated(
      {
        width,
        height,
        seed: 0,
        biomeIndex: new Uint8Array(size).fill(tundra),
        vegetationDensity: new Float32Array(size).fill(0.1),
        effectiveMoisture: new Float32Array(size).fill(120),
        surfaceTemperature: new Float32Array(size).fill(-6),
        aridityIndex: new Float32Array(size).fill(0.2),
        freezeIndex: new Float32Array(size).fill(0.95),
        elevation: new Int16Array(size).fill(2400),
        landMask: new Uint8Array(size).fill(1),
      },
      {
        strategy: "default",
        config: {
          snow: {
            enabled: true,
            elevationStrategy: "absolute",
            elevationMin: 0,
            elevationMax: 3000,
            coverageChance: 100,
            lightThreshold: 0,
            mediumThreshold: 0,
            heavyThreshold: 0,
          },
          sand: { enabled: false },
          burned: { enabled: false },
        },
      },
      { validateOutput: true }
    );

    expect(result.placements.length).toBeGreaterThan(0);
  });
});
