import { describe, it, expect } from "bun:test";
import { buildPlateTopology } from "@swooper/mapgen-core/lib/plates";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computeCrust from "../../src/domain/foundation/ops/compute-crust/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computeTectonicHistory from "../../src/domain/foundation/ops/compute-tectonic-history/index.js";
import computeTectonicSegments from "../../src/domain/foundation/ops/compute-tectonic-segments/index.js";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";

function neighborsFor(mesh: {
  neighborsOffsets: Int32Array;
  neighbors: Int32Array;
}, cellId: number): Int32Array {
  const start = mesh.neighborsOffsets[cellId] | 0;
  const end = mesh.neighborsOffsets[cellId + 1] | 0;
  return mesh.neighbors.slice(start, end);
}

function sumAreas(areas: Float32Array): number {
  let total = 0;
  for (let i = 0; i < areas.length; i++) total += areas[i] ?? 0;
  return total;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, q));
  const idx = Math.floor((sorted.length - 1) * clamped);
  return sorted[idx] ?? 0;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i] ?? 0;
  return s / values.length;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    const d = (values[i] ?? 0) - m;
    s += d * d;
  }
  return s / values.length;
}

describe("foundation mesh-first ops (slice 2)", () => {
  it("compute-mesh is deterministic and shape-correct", () => {
    const width = 40;
    const height = 20;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 9, cellsPerPlate: 2, relaxationSteps: 2, referenceArea: 800, plateScalePower: 0 },
      },
      ctx as any
    );

    const first = computeMesh.run(
      {
        width,
        height,
        rngSeed: 1,
      },
      meshConfig
    );

    const second = computeMesh.run(
      {
        width,
        height,
        rngSeed: 1,
      },
      meshConfig
    );

    expect(first.mesh.cellCount).toBeGreaterThan(0);
    expect(first.mesh.siteX.length).toBe(first.mesh.cellCount);
    expect(first.mesh.siteY.length).toBe(first.mesh.cellCount);
    expect(first.mesh.areas.length).toBe(first.mesh.cellCount);
    expect(first.mesh.neighborsOffsets.length).toBe(first.mesh.cellCount + 1);

    expect(first.mesh.wrapWidth).toBeGreaterThan(0);
    expect(Array.from(first.mesh.siteX)).toEqual(Array.from(second.mesh.siteX));
    expect(Array.from(first.mesh.siteY)).toEqual(Array.from(second.mesh.siteY));
    expect(Array.from(first.mesh.areas)).toEqual(Array.from(second.mesh.areas));
    expect(Array.from(first.mesh.neighborsOffsets)).toEqual(Array.from(second.mesh.neighborsOffsets));
    expect(Array.from(first.mesh.neighbors)).toEqual(Array.from(second.mesh.neighbors));

    const expectedArea =
      (first.mesh.bbox.xr - first.mesh.bbox.xl) * (first.mesh.bbox.yb - first.mesh.bbox.yt);
    const totalArea = sumAreas(first.mesh.areas);
    expect(Math.abs(totalArea - expectedArea)).toBeLessThan(expectedArea * 0.05);

    let hasSeamNeighbor = false;
    for (let i = 0; i < first.mesh.cellCount; i++) {
      const neighbors = neighborsFor(first.mesh, i);
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j]!;
        const back = neighborsFor(first.mesh, n);
        expect(Array.from(back)).toContain(i);
        if (Math.abs((first.mesh.siteX[n] ?? 0) - (first.mesh.siteX[i] ?? 0)) > first.mesh.wrapWidth * 0.5) {
          hasSeamNeighbor = true;
        }
      }
    }

    expect(hasSeamNeighbor).toBe(true);
  });

  it("compute-crust/compute-plate-graph/compute-tectonics are deterministic and internally consistent", () => {
    const width = 40;
    const height = 20;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 9, cellsPerPlate: 2, relaxationSteps: 2, referenceArea: 800, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run(
      {
        width,
        height,
        rngSeed: 2,
      },
      meshConfig
    ).mesh;

    const crustA = computeCrust.run(
      {
        mesh,
        rngSeed: 3,
      },
      computeCrust.defaultConfig
    ).crust;

    const crustB = computeCrust.run(
      {
        mesh,
        rngSeed: 3,
      },
      computeCrust.defaultConfig
    ).crust;

    expect(Array.from(crustA.type)).toEqual(Array.from(crustB.type));
    expect(Array.from(crustA.age)).toEqual(Array.from(crustB.age));
    expect(crustA.type.length).toBe(mesh.cellCount);
    expect(crustA.age.length).toBe(mesh.cellCount);

    const graphA = computePlateGraph.run(
      {
        mesh,
        crust: crustA,
        rngSeed: 4,
      },
      computePlateGraph.defaultConfig
    ).plateGraph;

    const graphB = computePlateGraph.run(
      {
        mesh,
        crust: crustA,
        rngSeed: 4,
      },
      computePlateGraph.defaultConfig
    ).plateGraph;

    expect(Array.from(graphA.cellToPlate)).toEqual(Array.from(graphB.cellToPlate));
    expect(graphA.cellToPlate.length).toBe(mesh.cellCount);
    expect(graphA.plates.length).toBeGreaterThan(1);

    const segA = computeTectonicSegments.run(
      {
        mesh,
        crust: crustA,
        plateGraph: graphA,
      },
      computeTectonicSegments.defaultConfig
    ).segments;

    const segB = computeTectonicSegments.run(
      {
        mesh,
        crust: crustA,
        plateGraph: graphA,
      },
      computeTectonicSegments.defaultConfig
    ).segments;

    expect(segA.segmentCount).toBe(segB.segmentCount);
    expect(Array.from(segA.aCell)).toEqual(Array.from(segB.aCell));
    expect(Array.from(segA.bCell)).toEqual(Array.from(segB.bCell));
    expect(Array.from(segA.regime)).toEqual(Array.from(segB.regime));

    const histA = computeTectonicHistory.run(
      { mesh, segments: segA },
      computeTectonicHistory.defaultConfig
    );
    const histB = computeTectonicHistory.run(
      { mesh, segments: segA },
      computeTectonicHistory.defaultConfig
    );

    expect(Array.from(histA.tectonics.boundaryType)).toEqual(Array.from(histB.tectonics.boundaryType));
    expect(histA.tectonics.boundaryType.length).toBe(mesh.cellCount);
    expect(histA.tectonics.upliftPotential.length).toBe(mesh.cellCount);
    expect(histA.tectonics.riftPotential.length).toBe(mesh.cellCount);
    expect(histA.tectonics.shearStress.length).toBe(mesh.cellCount);
    expect(histA.tectonics.volcanism.length).toBe(mesh.cellCount);
    expect(histA.tectonics.fracture.length).toBe(mesh.cellCount);
    expect(histA.tectonics.cumulativeUplift.length).toBe(mesh.cellCount);
  });

  it("plate partition yields non-uniform areas and plausible adjacency degrees (topology metrics)", () => {
    const width = 60;
    const height = 40;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 16, cellsPerPlate: 3, relaxationSteps: 2, referenceArea: 2400, plateScalePower: 0 },
      },
      ctx as any
    );

    const runCase = (seed: number) => {
      const mesh = computeMesh.run({ width, height, rngSeed: 1000 + seed }, meshConfig).mesh;
      const crust = computeCrust.run({ mesh, rngSeed: 2000 + seed }, computeCrust.defaultConfig).crust;

      const plateGraph = computePlateGraph.run(
        { mesh, crust, rngSeed: 3000 + seed },
        { strategy: "default", config: { plateCount: 16, referenceArea: 2400, plateScalePower: 0 } }
      ).plateGraph;

      const segments = computeTectonicSegments.run({ mesh, crust, plateGraph }, computeTectonicSegments.defaultConfig).segments;
      const tectonics = computeTectonicHistory.run(
        { mesh, segments },
        computeTectonicHistory.defaultConfig
      ).tectonics;

      const platesTensors = computePlatesTensors.run(
        { width, height, mesh, crust, plateGraph, tectonics },
        computePlatesTensors.defaultConfig
      );

      const tilePlateIds = platesTensors.plates.id;
      let maxId = -1;
      for (let i = 0; i < tilePlateIds.length; i++) maxId = Math.max(maxId, tilePlateIds[i] | 0);
      const plateCount = maxId + 1;
      expect(plateCount).toBe(16);

      const topology = buildPlateTopology(tilePlateIds, width, height, plateCount);
      const areas = topology.map((p) => p.area);
      const minArea = Math.min(...areas);

      const sortedAreas = [...areas].sort((a, b) => a - b);
      const p50 = quantile(sortedAreas, 0.5);
      const p90 = quantile(sortedAreas, 0.9);

      const degrees = topology.map((p) => p.neighbors.length);
      const meanDegree = mean(degrees);
      const degreeVar = variance(degrees);

      return { minArea, p50, p90, meanDegree, degreeVar };
    };

    const a = runCase(1);
    const b = runCase(2);

    for (const c of [a, b]) {
      expect(c.minArea).toBeGreaterThanOrEqual(8);
      expect(c.p50).toBeGreaterThan(0);
      expect(c.p90 / c.p50).toBeGreaterThanOrEqual(1.4);
      expect(c.meanDegree).toBeGreaterThanOrEqual(3);
      expect(c.meanDegree).toBeLessThanOrEqual(7);
      expect(c.degreeVar).toBeGreaterThan(0);
    }
  });

  it("compute-crust exhibits spatial coherence (non-IID)", () => {
    const width = 60;
    const height = 30;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 16, cellsPerPlate: 4, relaxationSteps: 2, referenceArea: 800, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run(
      {
        width,
        height,
        rngSeed: 10,
      },
      meshConfig
    ).mesh;

    const crust = computeCrust.run(
      {
        mesh,
        rngSeed: 11,
      },
      { strategy: "default", config: { continentalRatio: 0.35 } }
    ).crust;

    let sameTypeEdges = 0;
    let totalEdges = 0;
    for (let i = 0; i < mesh.cellCount; i++) {
      const neighbors = neighborsFor(mesh, i);
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j]!;
        if (n <= i) continue;
        totalEdges++;
        if (crust.type[i] === crust.type[n]) sameTypeEdges++;
      }
    }

    const sameTypeRatio = totalEdges <= 0 ? 1 : sameTypeEdges / totalEdges;
    expect(sameTypeRatio).toBeGreaterThan(0.7);

    let contSum = 0;
    let contCount = 0;
    let oceanSum = 0;
    let oceanCount = 0;
    for (let i = 0; i < mesh.cellCount; i++) {
      if (crust.type[i] === 1) {
        contSum += crust.age[i] ?? 0;
        contCount++;
      } else {
        oceanSum += crust.age[i] ?? 0;
        oceanCount++;
      }
    }

    if (contCount > 0 && oceanCount > 0) {
      expect(contSum / contCount).toBeGreaterThan(oceanSum / oceanCount);
    }
  });
});
