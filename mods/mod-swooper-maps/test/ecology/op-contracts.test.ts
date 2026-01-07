import { describe, expect, it } from "bun:test";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";

import * as ecology from "../../src/domain/ecology/index.js";
import { BIOME_SYMBOL_TO_INDEX } from "../../src/domain/ecology/types.js";

import { disabledEmbellishmentsConfig } from "./features-owned.helpers.js";

const createFeatureKeyField = (size: number) => new Int16Array(size).fill(-1);

describe("ecology op contract surfaces", () => {
  it("classifyPedology validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.classifyPedology.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(100),
        rainfall: new Uint8Array(size).fill(180),
        humidity: new Uint8Array(size).fill(150),
      },
      ecology.ops.classifyPedology.defaultConfig,
      { validateOutput: true }
    );
    expect(result.soilType.length).toBe(size);
    expect(result.fertility.length).toBe(size);
  });

  it("classifyPedology coastal shelf strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(
      ecology.ops.classifyPedology.strategies["coastal-shelf"].config,
      {}
    );
    const result = ecology.ops.classifyPedology.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(5),
        rainfall: new Uint8Array(size).fill(200),
        humidity: new Uint8Array(size).fill(180),
      },
      { strategy: "coastal-shelf", config },
      { validateOutput: true }
    );
    expect(result.soilType.length).toBe(size);
  });

  it("classifyPedology orogeny strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(
      ecology.ops.classifyPedology.strategies["orogeny-boosted"].config,
      {}
    );
    const result = ecology.ops.classifyPedology.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(1800),
        rainfall: new Uint8Array(size).fill(80),
        humidity: new Uint8Array(size).fill(50),
      },
      { strategy: "orogeny-boosted", config },
      { validateOutput: true }
    );
    expect(result.soilType.length).toBe(size);
  });

  it("planResourceBasins validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planResourceBasins.strategies["hydro-fluvial"].config, {
      resources: [{ id: "RESOURCE_OIL", target: 3, fertilityBias: 0.8, moistureBias: 1.5, spacing: 2 }],
    });
    const result = ecology.ops.planResourceBasins.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        fertility: new Float32Array(size).fill(0.8),
        soilType: new Uint8Array(size).fill(2),
        rainfall: new Uint8Array(size).fill(160),
        humidity: new Uint8Array(size).fill(120),
      },
      {
        strategy: "default",
        config: {
          resources: [{ id: "RESOURCE_IRON", target: 2, fertilityBias: 1, moistureBias: 1, spacing: 1 }],
        },
      },
      { validateOutput: true }
    );
    expect(result.basins.length).toBe(1);
    expect(result.basins[0]?.resourceId).toBe("RESOURCE_IRON");
  });

  it("planResourceBasins hydro strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planResourceBasins.strategies["hydro-fluvial"].config, {
      resources: [{ id: "RESOURCE_OIL", target: 3, fertilityBias: 0.8, moistureBias: 1.5, spacing: 2 }],
    });
    const result = ecology.ops.planResourceBasins.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        fertility: new Float32Array(size).fill(0.4),
        soilType: new Uint8Array(size).fill(1),
        rainfall: new Uint8Array(size).fill(220),
        humidity: new Uint8Array(size).fill(200),
      },
      { strategy: "hydro-fluvial", config },
      { validateOutput: true }
    );
    expect(result.basins.length).toBe(1);
  });

  it("refineBiomeEdges validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.refineBiomeEdges.runValidated(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(1),
        landMask: new Uint8Array(size).fill(1),
      },
      ecology.ops.refineBiomeEdges.defaultConfig,
      { validateOutput: true }
    );
    expect(result.biomeIndex.length).toBe(size);
  });

  it("refineBiomeEdges gaussian strategy validates output", () => {
    const width = 3;
    const height = 3;
    const size = width * height;
    const result = ecology.ops.refineBiomeEdges.runValidated(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(1),
        landMask: new Uint8Array(size).fill(1),
      },
      { strategy: "gaussian", config: { radius: 1, iterations: 1 } },
      { validateOutput: true }
    );
    expect(result.biomeIndex.length).toBe(size);
  });

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

  it("planVegetation validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.planVegetation.runValidated(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 0),
        vegetationDensity: new Float32Array(size).fill(0.8),
        effectiveMoisture: new Float32Array(size).fill(0.6),
        surfaceTemperature: new Float32Array(size).fill(15),
        fertility: new Float32Array(size).fill(0.5),
        landMask: new Uint8Array(size).fill(1),
      },
      ecology.ops.planVegetation.defaultConfig,
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planVegetation clustered strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planVegetation.strategies.clustered.config, {});
    const result = ecology.ops.planVegetation.runValidated(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 0),
        vegetationDensity: new Float32Array(size).fill(0.8),
        effectiveMoisture: new Float32Array(size).fill(0.6),
        surfaceTemperature: new Float32Array(size).fill(15),
        fertility: new Float32Array(size).fill(0.5),
        landMask: new Uint8Array(size).fill(1),
      },
      { strategy: "clustered", config },
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planWetlands validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.planWetlands.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        effectiveMoisture: new Float32Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(10),
        fertility: new Float32Array(size).fill(0.6),
        elevation: new Int16Array(size).fill(100),
      },
      ecology.ops.planWetlands.defaultConfig,
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planWetlands delta strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planWetlands.strategies["delta-focused"].config, {});
    const result = ecology.ops.planWetlands.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        effectiveMoisture: new Float32Array(size).fill(0.8),
        surfaceTemperature: new Float32Array(size).fill(14),
        fertility: new Float32Array(size).fill(0.4),
        elevation: new Int16Array(size).fill(50),
      },
      { strategy: "delta-focused", config },
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planReefs validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.planReefs.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(0),
        surfaceTemperature: new Float32Array(size).fill(20),
      },
      ecology.ops.planReefs.defaultConfig,
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThanOrEqual(0);
  });

  it("planReefs shipping lanes strategy validates output", () => {
    const width = 3;
    const height = 3;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planReefs.strategies["shipping-lanes"].config, {});
    const result = ecology.ops.planReefs.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(0),
        surfaceTemperature: new Float32Array(size).fill(24),
      },
      { strategy: "shipping-lanes", config },
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThanOrEqual(0);
  });

  it("planIce validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.planIce.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(-20),
        elevation: new Int16Array(size).fill(3000),
      },
      ecology.ops.planIce.defaultConfig,
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planIce continentality strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const config = applySchemaDefaults(ecology.ops.planIce.strategies.continentality.config, {
      alpineThreshold: 1200,
    });
    const result = ecology.ops.planIce.runValidated(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(-5),
        elevation: new Int16Array(size).fill(1500),
      },
      { strategy: "continentality", config },
      { validateOutput: true }
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("applyFeatures merges placements", () => {
    const result = ecology.ops.applyFeatures.runValidated(
      {
        vegetation: [{ x: 0, y: 0, feature: "FEATURE_FOREST" }],
        wetlands: [],
        reefs: [],
        ice: [],
      },
      ecology.ops.applyFeatures.defaultConfig,
      { validateOutput: true }
    );
    expect(result.placements.length).toBe(1);
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
