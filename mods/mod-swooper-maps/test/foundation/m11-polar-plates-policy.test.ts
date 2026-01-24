import { describe, expect, it } from "bun:test";

import computeCrust from "../../src/domain/foundation/ops/compute-crust/index.js";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computePlateGraph from "../../src/domain/foundation/ops/compute-plate-graph/index.js";

function collectPlateCells(cellToPlate: Int16Array, plateId: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < cellToPlate.length; i++) {
    if ((cellToPlate[i] | 0) === (plateId | 0)) out.push(i);
  }
  return out;
}

function isContiguous(mesh: { neighborsOffsets: Int32Array; neighbors: Int32Array }, cells: number[]): boolean {
  if (cells.length <= 1) return true;
  const maxCell = Math.max(...cells);
  const target = new Uint8Array(Math.max(1, maxCell + 1));
  for (const c of cells) target[c] = 1;

  const visited = new Uint8Array(target.length);
  const queue: number[] = [cells[0]!];
  let count = 0;

  while (queue.length > 0) {
    const cellId = queue.pop()!;
    if (!target[cellId]) continue;
    if (visited[cellId]) continue;
    visited[cellId] = 1;
    count++;

    const start = mesh.neighborsOffsets[cellId] | 0;
    const end = mesh.neighborsOffsets[cellId + 1] | 0;
    for (let j = start; j < end; j++) {
      const n = mesh.neighbors[j] | 0;
      if (n < 0 || n >= target.length) continue;
      if (!target[n]) continue;
      if (visited[n] === 2) continue;
      queue.push(n);
    }
  }

  return count === cells.length;
}

describe("m11 polar plates policy (caps + optional microplates)", () => {
  it("always emits north+south cap plates (contiguous, tangential motion baseline)", () => {
    const width = 90;
    const height = 60;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 18, cellsPerPlate: 3, relaxationSteps: 2, referenceArea: 5400, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run({ width, height, rngSeed: 1234 }, meshConfig).mesh;
    const crust = computeCrust.run({ mesh, rngSeed: 2345 }, computeCrust.defaultConfig).crust;

    const plateGraph = computePlateGraph.run(
      { mesh, crust, rngSeed: 3456 },
      {
        ...computePlateGraph.defaultConfig,
        config: {
          ...computePlateGraph.defaultConfig.config,
          plateCount: 18,
          plateScalePower: 0,
          referenceArea: width * height,
          polarCaps: {
            ...computePlateGraph.defaultConfig.config.polarCaps,
            capFraction: 0.1,
            microplatesPerPole: 0,
            tangentialSpeed: 1.0,
          },
        },
      }
    ).plateGraph;

    const caps = plateGraph.plates.filter((p) => p.role === "polarCap");
    expect(caps.length).toBe(2);
    expect(caps[0]?.id).toBe(0);
    expect(caps[1]?.id).toBe(1);

    for (const cap of caps) {
      expect(Math.abs(cap.velocityY)).toBe(0);
      expect(Math.abs(cap.velocityX)).toBeGreaterThan(0.05);

      const cells = collectPlateCells(plateGraph.cellToPlate, cap.id);
      expect(cells.length).toBeGreaterThan(Math.floor(mesh.cellCount * 0.03));
      expect(isContiguous(mesh, cells)).toBe(true);
    }
  });

  it("enables polar microplates only when configured, and they are not slivers", () => {
    const width = 120;
    const height = 80;

    const ctx = { env: { dimensions: { width, height } }, knobs: {} };
    const meshConfig = computeMesh.normalize(
      {
        strategy: "default",
        config: { plateCount: 24, cellsPerPlate: 8, relaxationSteps: 2, referenceArea: 9600, plateScalePower: 0 },
      },
      ctx as any
    );

    const mesh = computeMesh.run({ width, height, rngSeed: 4444 }, meshConfig).mesh;
    const crust = computeCrust.run({ mesh, rngSeed: 5555 }, computeCrust.defaultConfig).crust;

    const microplateMinAreaCells = 6;
    const plateGraph = computePlateGraph.run(
      { mesh, crust, rngSeed: 6666 },
      {
        ...computePlateGraph.defaultConfig,
        config: {
          ...computePlateGraph.defaultConfig.config,
          plateCount: 24,
          plateScalePower: 0,
          referenceArea: width * height,
          polarCaps: {
            ...computePlateGraph.defaultConfig.config.polarCaps,
            capFraction: 0.08,
            microplateBandFraction: 0.25,
            microplatesPerPole: 2,
            microplatesMinPlateCount: 0,
            microplateMinAreaCells,
            tangentialSpeed: 1.0,
            tangentialJitterDeg: 18,
          },
        },
      }
    ).plateGraph;

    const microplates = plateGraph.plates.filter((p) => p.role === "polarMicroplate");
    expect(microplates.length).toBe(4);

    for (const plate of microplates) {
      const cells = collectPlateCells(plateGraph.cellToPlate, plate.id);
      expect(cells.length).toBeGreaterThanOrEqual(microplateMinAreaCells);
      expect(isContiguous(mesh, cells)).toBe(true);
    }
  });
});
