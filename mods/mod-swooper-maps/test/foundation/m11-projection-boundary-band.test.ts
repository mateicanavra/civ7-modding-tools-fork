import { describe, expect, it } from "bun:test";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";
import computeTectonics from "../../src/domain/foundation/ops/compute-tectonics/index.js";
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

    const crust = { type: new Uint8Array(cellCount), age: new Uint8Array(cellCount) } as const;

    const plateGraphConfig = computePlateGraph.normalize(
      { strategy: "default", config: { plateCount: 10, referenceArea: width * height, plateScalePower: 0 } },
      ctx as any
    );
    const plateGraph = computePlateGraph.run({ mesh, crust: crust as any, rngSeed: 11 }, plateGraphConfig).plateGraph;

    const tectonics = computeTectonics.run(
      {
        mesh,
        crust: crust as any,
        plateGraph: plateGraph as any,
      },
      {
        strategy: "default",
        config: {
          polarBandFraction: 0.2,
          polarBoundary: {
            north: { regime: "transform", intensity: 0 },
            south: { regime: "transform", intensity: 0 },
          },
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

    let sawInfluenceBandTile = false;
    let sawRegimeInBand = false;
    let sawSignalsInBand = false;
    for (let i = 0; i < width * height; i++) {
      if (boundary[i] === 1) continue;
      if ((plates.boundaryCloseness[i] ?? 0) <= 0) continue;
      sawInfluenceBandTile = true;
      if ((plates.boundaryType[i] ?? 0) !== 0) sawRegimeInBand = true;
      if ((plates.upliftPotential[i] ?? 0) > 0 || (plates.riftPotential[i] ?? 0) > 0) sawSignalsInBand = true;
      if (sawRegimeInBand && sawSignalsInBand) break;
    }

    expect(sawInfluenceBandTile).toBe(true);
    expect(sawRegimeInBand).toBe(true);
    expect(sawSignalsInBand).toBe(true);

    for (let i = 0; i < width * height; i++) {
      const bc = plates.boundaryCloseness[i] ?? 0;
      if (bc <= 0 || bc >= 80) continue;
      expect(plates.boundaryType[i]).toBe(0);
    }
  });
});
