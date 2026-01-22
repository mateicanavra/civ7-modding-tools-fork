import { describe, it, expect } from "bun:test";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computeCrust from "../../src/domain/foundation/ops/compute-crust/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computeTectonics from "../../src/domain/foundation/ops/compute-tectonics/index.js";

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

    const tectA = computeTectonics.run(
      {
        mesh,
        crust: crustA,
        plateGraph: graphA,
      },
      computeTectonics.defaultConfig
    ).tectonics;

    const tectB = computeTectonics.run(
      {
        mesh,
        crust: crustA,
        plateGraph: graphA,
      },
      computeTectonics.defaultConfig
    ).tectonics;

    expect(Array.from(tectA.boundaryType)).toEqual(Array.from(tectB.boundaryType));
    expect(tectA.boundaryType.length).toBe(mesh.cellCount);
    expect(tectA.upliftPotential.length).toBe(mesh.cellCount);
    expect(tectA.riftPotential.length).toBe(mesh.cellCount);
    expect(tectA.shearStress.length).toBe(mesh.cellCount);
    expect(tectA.volcanism.length).toBe(mesh.cellCount);
    expect(tectA.fracture.length).toBe(mesh.cellCount);
    expect(tectA.cumulativeUplift.length).toBe(mesh.cellCount);
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
