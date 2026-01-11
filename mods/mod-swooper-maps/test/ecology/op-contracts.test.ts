import { describe, expect, it } from "bun:test";
import * as ecology from "../../src/domain/ecology/ops.js";
import { BIOME_SYMBOL_TO_INDEX } from "../../src/domain/ecology/types.js";

import { disabledEmbellishmentsConfig } from "./features-owned.helpers.js";
import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";

const createFeatureKeyField = (size: number) => new Int16Array(size).fill(-1);

describe("ecology op contract surfaces", () => {
  it("classifyPedology validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.classifyPedology, {
      strategy: "default",
      config: {},
    });
    const result = ecology.ops.classifyPedology.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(100),
        rainfall: new Uint8Array(size).fill(180),
        humidity: new Uint8Array(size).fill(150),
      },
      selection
    );
    expect(result.soilType.length).toBe(size);
    expect(result.fertility.length).toBe(size);
  });

  it("classifyPedology coastal shelf strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.classifyPedology, {
      strategy: "coastal-shelf",
      config: {},
    });
    const result = ecology.ops.classifyPedology.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(5),
        rainfall: new Uint8Array(size).fill(200),
        humidity: new Uint8Array(size).fill(180),
      },
      selection
    );
    expect(result.soilType.length).toBe(size);
  });

  it("classifyPedology orogeny strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.classifyPedology, {
      strategy: "orogeny-boosted",
      config: {},
    });
    const result = ecology.ops.classifyPedology.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        elevation: new Int16Array(size).fill(1800),
        rainfall: new Uint8Array(size).fill(80),
        humidity: new Uint8Array(size).fill(50),
      },
      selection
    );
    expect(result.soilType.length).toBe(size);
  });

  it("planResourceBasins validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planResourceBasins, {
      strategy: "default",
      config: {
        resources: [
          { id: "RESOURCE_IRON", target: 2, fertilityBias: 1, moistureBias: 1, spacing: 1 },
        ],
      },
    });
    const result = ecology.ops.planResourceBasins.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        fertility: new Float32Array(size).fill(0.8),
        soilType: new Uint8Array(size).fill(2),
        rainfall: new Uint8Array(size).fill(160),
        humidity: new Uint8Array(size).fill(120),
      },
      selection
    );
    expect(result.basins.length).toBe(1);
    expect(result.basins[0]?.resourceId).toBe("RESOURCE_IRON");
  });

  it("planResourceBasins hydro strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planResourceBasins, {
      strategy: "hydro-fluvial",
      config: {
        resources: [
          { id: "RESOURCE_OIL", target: 3, fertilityBias: 0.8, moistureBias: 1.5, spacing: 2 },
        ],
      },
    });
    const result = ecology.ops.planResourceBasins.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        fertility: new Float32Array(size).fill(0.4),
        soilType: new Uint8Array(size).fill(1),
        rainfall: new Uint8Array(size).fill(220),
        humidity: new Uint8Array(size).fill(200),
      },
      selection
    );
    expect(result.basins.length).toBe(1);
  });

  it("refineBiomeEdges validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const result = ecology.ops.refineBiomeEdges.run(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(1),
        landMask: new Uint8Array(size).fill(1),
      },
      ecology.ops.refineBiomeEdges.defaultConfig
    );
    expect(result.biomeIndex.length).toBe(size);
  });

  it("refineBiomeEdges gaussian strategy validates output", () => {
    const width = 3;
    const height = 3;
    const size = width * height;
    const result = ecology.ops.refineBiomeEdges.run(
      {
        width,
        height,
        biomeIndex: new Uint8Array(size).fill(1),
        landMask: new Uint8Array(size).fill(1),
      },
      { strategy: "gaussian", config: { radius: 1, iterations: 1 } }
    );
    expect(result.biomeIndex.length).toBe(size);
  });

  it("classifyBiomes validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.classifyBiomes, {
      strategy: "default",
      config: {},
    });

    const result = ecology.ops.classifyBiomes.run(
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
      selection
    );

    expect(result.biomeIndex.length).toBe(size);
    expect(result.vegetationDensity.length).toBe(size);
  });

  it("planVegetatedFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planVegetatedFeaturePlacements, {
      strategy: "default",
      config: {
        chances: { FEATURE_FOREST: 100 },
        rules: { vegetationChanceScalar: 1 },
      },
    });

    const result = ecology.ops.planVegetatedFeaturePlacements.run(
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
      selection
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_FOREST");
  });

  it("planWetFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planWetFeaturePlacements, {
      strategy: "default",
      config: { chances: { FEATURE_MARSH: 100 } },
    });

    const result = ecology.ops.planWetFeaturePlacements.run(
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
      selection
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_MARSH");
  });

  it("planAquaticFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planAquaticFeaturePlacements, {
      strategy: "default",
      config: {
        chances: { FEATURE_REEF: 100 },
        rules: { reefLatitudeSplit: 90 },
      },
    });

    const result = ecology.ops.planAquaticFeaturePlacements.run(
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
      selection
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_REEF");
  });

  it("planIceFeaturePlacements validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planIceFeaturePlacements, {
      strategy: "default",
      config: {
        chances: { FEATURE_ICE: 100 },
        rules: {
          minAbsLatitude: 0,
          forbidAdjacentToLand: false,
          forbidAdjacentToNaturalWonders: false,
        },
      },
    });

    const result = ecology.ops.planIceFeaturePlacements.run(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(0),
        latitude: new Float32Array(size).fill(80),
        featureKeyField: createFeatureKeyField(size),
        naturalWonderMask: new Uint8Array(size).fill(0),
      },
      selection
    );

    expect(result.placements.length).toBe(size);
    expect(result.placements[0]?.feature).toBe("FEATURE_ICE");
  });

  it("planReefEmbellishments validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;

    const result = ecology.ops.planReefEmbellishments.run(
      {
        width,
        height,
        seed: 0,
        landMask: new Uint8Array(size).fill(0),
        featureKeyField: createFeatureKeyField(size),
        paradiseMask: new Uint8Array(size).fill(0),
        passiveShelfMask: new Uint8Array(size).fill(0),
      },
      { strategy: "default", config: disabledEmbellishmentsConfig }
    );

    expect(Array.isArray(result.placements)).toBe(true);
  });

  it("planVegetationEmbellishments validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const temperateHumid = BIOME_SYMBOL_TO_INDEX.temperateHumid ?? 4;

    const result = ecology.ops.planVegetationEmbellishments.run(
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
      { strategy: "default", config: disabledEmbellishmentsConfig }
    );

    expect(Array.isArray(result.placements)).toBe(true);
  });

  it("planVegetation validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planVegetation, {
      strategy: "default",
      config: {},
    });
    const result = ecology.ops.planVegetation.run(
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
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planVegetation clustered strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planVegetation, {
      strategy: "clustered",
      config: {},
    });
    const result = ecology.ops.planVegetation.run(
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
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planWetlands validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planWetlands, {
      strategy: "default",
      config: {},
    });
    const result = ecology.ops.planWetlands.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        effectiveMoisture: new Float32Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(10),
        fertility: new Float32Array(size).fill(0.6),
        elevation: new Int16Array(size).fill(100),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planWetlands delta strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planWetlands, {
      strategy: "delta-focused",
      config: {},
    });
    const result = ecology.ops.planWetlands.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        effectiveMoisture: new Float32Array(size).fill(0.8),
        surfaceTemperature: new Float32Array(size).fill(14),
        fertility: new Float32Array(size).fill(0.4),
        elevation: new Int16Array(size).fill(50),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planReefs validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planReefs, {
      strategy: "default",
      config: {},
    });
    const result = ecology.ops.planReefs.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(0),
        surfaceTemperature: new Float32Array(size).fill(20),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThanOrEqual(0);
  });

  it("planReefs shipping lanes strategy validates output", () => {
    const width = 3;
    const height = 3;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planReefs, {
      strategy: "shipping-lanes",
      config: {},
    });
    const result = ecology.ops.planReefs.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(0),
        surfaceTemperature: new Float32Array(size).fill(24),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThanOrEqual(0);
  });

  it("planIce validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planIce, {
      strategy: "default",
      config: {},
    });
    const result = ecology.ops.planIce.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(-20),
        elevation: new Int16Array(size).fill(3000),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("planIce continentality strategy validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planIce, {
      strategy: "continentality",
      config: { alpineThreshold: 1200 },
    });
    const result = ecology.ops.planIce.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        surfaceTemperature: new Float32Array(size).fill(-5),
        elevation: new Int16Array(size).fill(1500),
      },
      selection
    );
    expect(result.placements.length).toBeGreaterThan(0);
  });

  it("applyFeatures merges placements", () => {
    const result = ecology.ops.applyFeatures.run(
      {
        vegetation: [{ x: 0, y: 0, feature: "FEATURE_FOREST" }],
        wetlands: [],
        reefs: [],
        ice: [],
      },
      ecology.ops.applyFeatures.defaultConfig
    );
    expect(result.placements.length).toBe(1);
  });

  it("planPlotEffects validates output", () => {
    const width = 2;
    const height = 2;
    const size = width * height;
    const tundra = BIOME_SYMBOL_TO_INDEX.tundra ?? 1;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planPlotEffects, {
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
    });

    const result = ecology.ops.planPlotEffects.run(
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
      selection
    );

    expect(result.placements.length).toBeGreaterThan(0);
  });
});
