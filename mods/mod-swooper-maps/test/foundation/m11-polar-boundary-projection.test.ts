import { describe, it, expect } from "bun:test";

import { BOUNDARY_TYPE } from "../../src/domain/foundation/constants.js";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";
import computeTectonics from "../../src/domain/foundation/ops/compute-tectonics/index.js";

describe("m11 polar boundary projection", () => {
  it("projects polar edge regimes into tile-level plate boundary fields", () => {
    const width = 60;
    const height = 40;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 10, cellsPerPlate: 6, relaxationSteps: 2, referenceArea: 800, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run({ width, height, rngSeed: 7 }, meshConfig).mesh;
    const cellCount = mesh.cellCount | 0;

    const crust = { type: new Uint8Array(cellCount), age: new Uint8Array(cellCount) } as const;
    const cellToPlate = new Int16Array(cellCount);
    cellToPlate.fill(0);
    const plateGraph = {
      cellToPlate,
      plates: [{ id: 0, kind: "major", seedX: 0, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 }],
    } as const;

    const tectonicsConfig = {
      strategy: "default",
      config: {
        polarBandFraction: 0.25,
        polarBoundary: {
          north: { regime: "convergent", intensity: 2.0 },
          south: { regime: "divergent", intensity: 2.0 },
        },
      },
    } as const;

    const tectonics = computeTectonics.run(
      { mesh, crust: crust as any, plateGraph: plateGraph as any },
      tectonicsConfig
    ).tectonics;

    const first = computePlatesTensors.run(
      { width, height, mesh: mesh as any, crust: crust as any, plateGraph: plateGraph as any, tectonics: tectonics as any },
      computePlatesTensors.defaultConfig
    ).plates;

    const second = computePlatesTensors.run(
      { width, height, mesh: mesh as any, crust: crust as any, plateGraph: plateGraph as any, tectonics: tectonics as any },
      computePlatesTensors.defaultConfig
    ).plates;

    expect(Array.from(first.boundaryCloseness)).toEqual(Array.from(second.boundaryCloseness));
    expect(Array.from(first.boundaryType)).toEqual(Array.from(second.boundaryType));

    const bandTiles = Math.max(1, Math.floor(height * 0.25));
    let northHasBoundary = false;
    let southHasBoundary = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const closeness = first.boundaryCloseness[i] ?? 0;
        const type = first.boundaryType[i] ?? BOUNDARY_TYPE.none;

        if (y < bandTiles && closeness > 0 && type === BOUNDARY_TYPE.convergent) northHasBoundary = true;
        if (y >= height - bandTiles && closeness > 0 && type === BOUNDARY_TYPE.divergent) southHasBoundary = true;
      }
    }

    expect(northHasBoundary).toBe(true);
    expect(southHasBoundary).toBe(true);
  });
});

