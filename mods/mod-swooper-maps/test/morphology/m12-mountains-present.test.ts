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
import planRidgesAndFoothills from "../../src/domain/morphology/ops/plan-ridges-and-foothills/index.js";

describe("m12 mountains: ridge planning produces some non-volcano mountains", () => {
  it("produces a non-zero mountain mask on an earthlike-ish run", () => {
    const width = 96;
    const height = 72;
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
      computeLandmask.defaultConfig
    );

    const fractalMountain = new Int16Array(size);
    const fractalHill = new Int16Array(size);
    fractalMountain.fill(255);
    fractalHill.fill(255);

    const ridges = planRidgesAndFoothills.run(
      {
        width,
        height,
        landMask: landmask.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
        tectonicStress: plates.tectonicStress,
        fractalMountain,
        fractalHill,
      },
      {
        ...planRidgesAndFoothills.defaultConfig,
        config: {
          ...planRidgesAndFoothills.defaultConfig.config,
          // Mirror the current authored swooper-earthlike mountains posture.
          tectonicIntensity: 0.64,
          mountainThreshold: 0.59,
          hillThreshold: 0.44,
          upliftWeight: 0.28,
          fractalWeight: 0.72,
          riftDepth: 0.27,
          boundaryWeight: 0.18,
          boundaryGate: 0.11,
          boundaryExponent: 1.18,
          interiorPenaltyWeight: 0.09,
          convergenceBonus: 0.6,
          transformPenalty: 0.65,
          riftPenalty: 0.78,
          hillBoundaryWeight: 0.32,
          hillRiftBonus: 0.36,
          hillConvergentFoothill: 0.36,
          hillInteriorFalloff: 0.2,
          hillUpliftWeight: 0.18,
        },
      }
    );

    let landTiles = 0;
    let mountainTiles = 0;
    let hillTiles = 0;
    for (let i = 0; i < size; i++) {
      if (landmask.landMask[i] !== 1) continue;
      landTiles++;
      if (ridges.mountainMask[i] === 1) mountainTiles++;
      else if (ridges.hillMask[i] === 1) hillTiles++;
    }

    expect(landTiles).toBeGreaterThan(0);
    expect(mountainTiles).toBeGreaterThan(0);
    expect(mountainTiles + hillTiles).toBeGreaterThan(0);
  });
});

