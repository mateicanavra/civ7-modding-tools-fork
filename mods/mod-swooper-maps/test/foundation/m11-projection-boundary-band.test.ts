import { describe, expect, it } from "bun:test";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computeTectonicHistory from "../../src/domain/foundation/ops/compute-tectonic-history/index.js";
import computeTectonicSegments from "../../src/domain/foundation/ops/compute-tectonic-segments/index.js";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";

function computeBoundaryTiles(width: number, height: number, plateId: Int16Array): Uint8Array {
  const size = width * height;
  const boundary = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i]!;
      let isBoundary = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (plateId[ni] !== myPlate) isBoundary = true;
      });
      boundary[i] = isBoundary ? 1 : 0;
    }
  }
  return boundary;
}

function computeDistanceFieldOddQ(params: {
  width: number;
  height: number;
  isSeed: Uint8Array;
  maxDistance: number;
}): Uint8Array {
  const { width, height } = params;
  const size = width * height;
  const dist = new Uint8Array(size);
  dist.fill(255);

  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < size; i++) {
    if (params.isSeed[i]) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }

  while (head < tail) {
    const i = queue[head++]!;
    const d = dist[i]!;
    if (d >= (params.maxDistance | 0)) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
      const ni = ny * width + nx;
      const next = (d + 1) as number;
      if (dist[ni]! > next) {
        dist[ni] = next;
        queue[tail++] = ni;
      }
    });
  }

  return dist;
}

describe("m11 plates projection (boundary band)", () => {
  it("projects boundary regime + signals beyond the exact boundary line", () => {
    const width = 44;
    const height = 26;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: {
          plateCount: 10,
          cellsPerPlate: 4,
          relaxationSteps: 2,
          referenceArea: width * height,
          plateScalePower: 0,
        },
      },
      ctx as any
    );
    const mesh = computeMesh.run({ width, height, rngSeed: 7 }, meshConfig).mesh;
    const cellCount = mesh.cellCount | 0;

    const crust = {
      type: new Uint8Array(cellCount),
      age: new Uint8Array(cellCount),
      buoyancy: new Float32Array(cellCount),
      baseElevation: new Float32Array(cellCount),
      strength: new Float32Array(cellCount),
    } as const;

    const plateGraphConfig = computePlateGraph.normalize(
      { strategy: "default", config: { plateCount: 10, referenceArea: width * height, plateScalePower: 0 } },
      ctx as any
    );
    const plateGraph = computePlateGraph.run({ mesh, crust: crust as any, rngSeed: 11 }, plateGraphConfig).plateGraph;

    const segments = computeTectonicSegments.run(
      { mesh, crust: crust as any, plateGraph: plateGraph as any },
      computeTectonicSegments.defaultConfig
    ).segments;

    const tectonics = computeTectonicHistory.run(
      { mesh, segments },
      {
        strategy: "default",
        config: {
          eraWeights: [0.35, 0.35, 0.3],
          driftStepsByEra: [2, 1, 0],
          beltInfluenceDistance: 8,
          beltDecay: 0.55,
          activityThreshold: 1,
        },
      }
    ).tectonics;

    const projected = computePlatesTensors.run(
      {
        width,
        height,
        mesh,
        crust: crust as any,
        plateGraph: plateGraph as any,
        tectonics: tectonics as any,
      },
      {
        strategy: "default",
        config: {
          boundaryInfluenceDistance: 6,
          boundaryDecay: 0.55,
          movementScale: 100,
          rotationScale: 100,
        },
      }
    );

    const plates = projected.plates;
    const boundary = computeBoundaryTiles(width, height, plates.id);
    const boundaryDist = computeDistanceFieldOddQ({ width, height, isSeed: boundary, maxDistance: 8 });

    let sawMultiTileBelt = false;
    for (let i = 0; i < width * height; i++) {
      const d = boundaryDist[i] ?? 255;
      if (d < 3 || d > 8) continue;
      if ((plates.boundaryType[i] ?? 0) === 0) continue;
      if ((plates.upliftPotential[i] ?? 0) <= 0 && (plates.riftPotential[i] ?? 0) <= 0) continue;
      sawMultiTileBelt = true;
      break;
    }

    expect(sawMultiTileBelt).toBe(true);
  });
});
