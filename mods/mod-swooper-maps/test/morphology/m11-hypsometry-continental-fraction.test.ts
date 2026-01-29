import { describe, expect, it } from "bun:test";

import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computeCrust from "../../src/domain/foundation/ops/compute-crust/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computeTectonicSegments from "../../src/domain/foundation/ops/compute-tectonic-segments/index.js";
import computeTectonicHistory from "../../src/domain/foundation/ops/compute-tectonic-history/index.js";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";

import computeBaseTopography from "../../src/domain/morphology/ops/compute-base-topography/index.js";
import computeLandmask from "../../src/domain/morphology/ops/compute-landmask/index.js";
import computeSeaLevel from "../../src/domain/morphology/ops/compute-sea-level/index.js";

function share(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

describe("m11 hypsometry: continentalFraction does not collapse water coverage", () => {
  it("keeps non-trivial water coverage while meeting continentalFraction target", () => {
    const width = 80;
    const height = 60;
    const size = width * height;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };

    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 19, cellsPerPlate: 7, relaxationSteps: 6, referenceArea: 16000, plateScalePower: 1 },
      },
      ctx as any
    );
    const mesh = computeMesh.run({ width, height, rngSeed: 1 }, meshConfig).mesh;

    const crust = computeCrust.run(
      { mesh, rngSeed: 2 },
      { ...computeCrust.defaultConfig, config: { ...computeCrust.defaultConfig.config, continentalRatio: 0.37 } }
    ).crust;

    const plateGraphConfig = computePlateGraph.normalize(
      { strategy: "default", config: { plateCount: 19, referenceArea: 16000, plateScalePower: 1 } },
      ctx as any
    );
    const plateGraph = computePlateGraph.run({ mesh, crust, rngSeed: 3 }, plateGraphConfig).plateGraph;

    const segments = computeTectonicSegments.run(
      { mesh, crust, plateGraph },
      {
        ...computeTectonicSegments.defaultConfig,
        config: { ...computeTectonicSegments.defaultConfig.config, intensityScale: 180, regimeMinIntensity: 4 },
      }
    ).segments;

    const history = computeTectonicHistory.run(
      { mesh, segments },
      {
        ...computeTectonicHistory.defaultConfig,
        config: {
          ...computeTectonicHistory.defaultConfig.config,
          eraWeights: [0.35, 0.35, 0.3],
          driftStepsByEra: [2, 1, 0],
          beltInfluenceDistance: 8,
          beltDecay: 0.55,
          activityThreshold: 1,
        },
      }
    );

    const projection = computePlatesTensors.run(
      { width, height, mesh, crust, plateGraph, tectonics: history.tectonics },
      {
        ...computePlatesTensors.defaultConfig,
        config: {
          ...computePlatesTensors.defaultConfig.config,
          boundaryInfluenceDistance: 12,
          boundaryDecay: 0.5,
          movementScale: 65,
          rotationScale: 80,
        },
      }
    );
    const plates = projection.plates;
    const crustTiles = projection.crustTiles;

    const baseTopography = computeBaseTopography.run(
      {
        width,
        height,
        crustBaseElevation: crustTiles.baseElevation,
        boundaryCloseness: plates.boundaryCloseness,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
        rngSeed: 4,
      },
      computeBaseTopography.defaultConfig
    );

    const seaLevel = computeSeaLevel.run(
      {
        width,
        height,
        elevation: baseTopography.elevation,
        crustType: crustTiles.type,
        boundaryCloseness: plates.boundaryCloseness,
        upliftPotential: plates.upliftPotential,
        rngSeed: 5,
      },
      {
        ...computeSeaLevel.defaultConfig,
        config: {
          ...computeSeaLevel.defaultConfig.config,
          targetWaterPercent: 63,
          targetScalar: 1,
          variance: 0,
          boundaryShareTarget: 0.08,
          continentalFraction: 0.39,
        },
      }
    ).seaLevel;

    const landmask = computeLandmask.run(
      { width, height, elevation: baseTopography.elevation, seaLevel, boundaryCloseness: plates.boundaryCloseness },
      {
        ...computeLandmask.defaultConfig,
        config: {
          ...computeLandmask.defaultConfig.config,
          basinSeparation: { ...computeLandmask.defaultConfig.config.basinSeparation, enabled: false },
        },
      }
    );

    let land = 0;
    let water = 0;
    let continentalLand = 0;
    for (let i = 0; i < size; i++) {
      const isLand = landmask.landMask[i] === 1;
      if (isLand) {
        land++;
        if ((crustTiles.type[i] ?? 0) === 1) continentalLand++;
      } else {
        water++;
      }
    }

    const waterShare = share(water, size);
    const continentalShare = share(continentalLand, land);

    // Regression guard: previously, continentalFraction could drive targetWaterPercent to ~0,
    // producing near-all-land maps (glacier-scrape oceans).
    expect(waterShare).toBeGreaterThan(0.2);
    expect(waterShare).toBeLessThan(0.9);

    // Soft check: ensure the resulting land skew is not overwhelmingly oceanic.
    expect(continentalShare).toBeGreaterThanOrEqual(0.35);
  });
});
