import { describe, expect, it } from "bun:test";

import computeCrust from "../../src/domain/foundation/ops/compute-crust/index.js";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";
import computeTectonicHistory from "../../src/domain/foundation/ops/compute-tectonic-history/index.js";
import computeTectonicSegments from "../../src/domain/foundation/ops/compute-tectonic-segments/index.js";
import computeBaseTopography from "../../src/domain/morphology/ops/compute-base-topography/index.js";

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, q));
  const idx = Math.floor((sorted.length - 1) * clamped);
  return sorted[idx] ?? 0;
}

describe("m11 morphology baseline consumes crust isostasy prior", () => {
  it("still separates continents vs ocean when tectonic uplift/rift are zero", () => {
    const width = 60;
    const height = 40;
    const size = width * height;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 16, cellsPerPlate: 3, relaxationSteps: 2, referenceArea: 2400, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run({ width, height, rngSeed: 10 }, meshConfig).mesh;
    const crust = computeCrust.run(
      { mesh, rngSeed: 11 },
      {
        ...computeCrust.defaultConfig,
        config: { ...computeCrust.defaultConfig.config, continentalRatio: 0.35 },
      }
    ).crust;
    const plateGraph = computePlateGraph.run(
      { mesh, crust, rngSeed: 12 },
      {
        strategy: "default",
        config: {
          plateCount: 16,
          referenceArea: 2400,
          plateScalePower: 0,
          polarCaps: {
            capFraction: 0.1,
            microplateBandFraction: 0.2,
            microplatesPerPole: 0,
            microplatesMinPlateCount: 14,
            microplateMinAreaCells: 8,
            tangentialSpeed: 0.9,
            tangentialJitterDeg: 12,
          },
        },
      }
    ).plateGraph;
    const segments = computeTectonicSegments.run({ mesh, crust, plateGraph }, computeTectonicSegments.defaultConfig).segments;
    const tectonics = computeTectonicHistory.run({ mesh, segments }, computeTectonicHistory.defaultConfig).tectonics;
    const crustTiles = computePlatesTensors.run(
      { width, height, mesh, crust, plateGraph, tectonics },
      computePlatesTensors.defaultConfig
    ).crustTiles;

    const elevation = computeBaseTopography.run(
      {
        width,
        height,
        crustBaseElevation: crustTiles.baseElevation,
        boundaryCloseness: new Uint8Array(size),
        upliftPotential: new Uint8Array(size),
        riftPotential: new Uint8Array(size),
        rngSeed: 123,
      },
      computeBaseTopography.defaultConfig
    ).elevation;

    const continental: number[] = [];
    const oceanic: number[] = [];
    for (let i = 0; i < size; i++) {
      const value = elevation[i] ?? 0;
      if (crustTiles.type[i] === 1) continental.push(value);
      else oceanic.push(value);
    }
    continental.sort((a, b) => a - b);
    oceanic.sort((a, b) => a - b);

    if (continental.length > 0 && oceanic.length > 0) {
      expect(quantile(continental, 0.5)).toBeGreaterThan(quantile(oceanic, 0.5));
    }
  });
});
