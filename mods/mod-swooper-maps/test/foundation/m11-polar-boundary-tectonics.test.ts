import { describe, it, expect } from "bun:test";
import computeMesh from "../../src/domain/foundation/ops/compute-mesh/index.js";
import computeTectonics from "../../src/domain/foundation/ops/compute-tectonics/index.js";

describe("m11 polar boundary tectonics", () => {
  it("adds deterministic edge-band regime signals", () => {
    const width = 40;
    const height = 20;

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

    const config = {
      strategy: "default",
      config: {
        polarBandFraction: 0.2,
        polarBoundary: {
          north: { regime: "convergent", intensity: 1.0 },
          south: { regime: "divergent", intensity: 1.0 },
        },
      },
    } as const;

    const first = computeTectonics.run({ mesh, crust: crust as any, plateGraph: plateGraph as any }, config).tectonics;
    const second = computeTectonics.run({ mesh, crust: crust as any, plateGraph: plateGraph as any }, config).tectonics;

    expect(Array.from(first.boundaryType)).toEqual(Array.from(second.boundaryType));
    expect(Array.from(first.upliftPotential)).toEqual(Array.from(second.upliftPotential));
    expect(Array.from(first.riftPotential)).toEqual(Array.from(second.riftPotential));

    const yt = mesh.bbox.yt ?? 0;
    const yb = mesh.bbox.yb ?? 0;
    const band = (yb - yt) * 0.2;

    let northHasSignal = false;
    let southHasSignal = false;
    for (let i = 0; i < cellCount; i++) {
      const y = mesh.siteY[i] ?? 0;
      if (y <= yt + band) {
        if ((first.upliftPotential[i] ?? 0) > 0) northHasSignal = true;
      }
      if (y >= yb - band) {
        if ((first.riftPotential[i] ?? 0) > 0) southHasSignal = true;
      }
    }

    expect(northHasSignal).toBe(true);
    expect(southHasSignal).toBe(true);
  });
});

