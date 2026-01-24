import { describe, expect, it } from "bun:test";

import computeTectonicHistory from "../../src/domain/foundation/ops/compute-tectonic-history/index.js";
import computeTectonicSegments from "../../src/domain/foundation/ops/compute-tectonic-segments/index.js";

function makeTwoCellMesh(): any {
  return {
    cellCount: 2,
    wrapWidth: 10,
    siteX: new Float32Array([0, 1]),
    siteY: new Float32Array([0, 0]),
    neighborsOffsets: new Int32Array([0, 1, 2]),
    neighbors: new Int32Array([1, 0]),
    areas: new Float32Array([1, 1]),
    bbox: { xl: 0, xr: 1, yt: 0, yb: 1 },
  } as const;
}

describe("m11 tectonics (segments + history)", () => {
  it("segment decomposition is rotation-aware (shear changes when rotation changes)", () => {
    const mesh = makeTwoCellMesh();
    const crust = { type: new Uint8Array([0, 0]), age: new Uint8Array([0, 0]) } as const;

    const basePlateGraph = {
      cellToPlate: new Int16Array([0, 1]),
      plates: [
        { id: 0, kind: "major", seedX: 0, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 },
        { id: 1, kind: "major", seedX: 1, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 },
      ],
    } as const;

    const noRot = computeTectonicSegments.run(
      { mesh, crust: crust as any, plateGraph: basePlateGraph as any },
      computeTectonicSegments.defaultConfig
    ).segments;

    const withRotPlateGraph = {
      ...basePlateGraph,
      plates: [
        basePlateGraph.plates[0],
        { ...basePlateGraph.plates[1], rotation: 1.0 },
      ],
    } as const;

    const withRot = computeTectonicSegments.run(
      { mesh, crust: crust as any, plateGraph: withRotPlateGraph as any },
      computeTectonicSegments.defaultConfig
    ).segments;

    expect(noRot.segmentCount).toBe(1);
    expect(withRot.segmentCount).toBe(1);
    expect(noRot.shear[0]).toBe(0);
    expect(withRot.shear[0]).toBeGreaterThan(0);
  });

  it("convergent polarity is stable for oceanic-under-continental pairing", () => {
    const mesh = makeTwoCellMesh();
    const crust = { type: new Uint8Array([0, 1]), age: new Uint8Array([0, 0]) } as const;

    const plateGraph = {
      cellToPlate: new Int16Array([0, 1]),
      plates: [
        { id: 0, kind: "major", seedX: 0, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 },
        { id: 1, kind: "major", seedX: 1, seedY: 0, velocityX: -1.0, velocityY: 0, rotation: 0 },
      ],
    } as const;

    const segments = computeTectonicSegments.run(
      { mesh, crust: crust as any, plateGraph: plateGraph as any },
      computeTectonicSegments.defaultConfig
    ).segments;

    expect(segments.segmentCount).toBe(1);
    expect(segments.regime[0]).toBeGreaterThan(0);
    expect(segments.polarity[0]).toBe(-1);
  });

  it("3-era history is deterministic and populates lastActiveEra", () => {
    const mesh = makeTwoCellMesh();
    const crust = { type: new Uint8Array([0, 1]), age: new Uint8Array([0, 0]) } as const;

    const plateGraph = {
      cellToPlate: new Int16Array([0, 1]),
      plates: [
        { id: 0, kind: "major", seedX: 0, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 },
        { id: 1, kind: "major", seedX: 1, seedY: 0, velocityX: -1.0, velocityY: 0, rotation: 0 },
      ],
    } as const;

    const segments = computeTectonicSegments.run(
      { mesh, crust: crust as any, plateGraph: plateGraph as any },
      computeTectonicSegments.defaultConfig
    ).segments;

    const a = computeTectonicHistory.run({ mesh, segments }, computeTectonicHistory.defaultConfig);
    const b = computeTectonicHistory.run({ mesh, segments }, computeTectonicHistory.defaultConfig);

    expect(a.tectonicHistory.eraCount).toBe(3);
    expect(a.tectonicHistory.eras.length).toBe(3);
    expect(Array.from(a.tectonicHistory.upliftTotal)).toEqual(Array.from(b.tectonicHistory.upliftTotal));
    expect(Array.from(a.tectonicHistory.lastActiveEra)).toEqual(Array.from(b.tectonicHistory.lastActiveEra));

    // Both cells are within belt influence for this tiny mesh and should be active in the newest era.
    expect(a.tectonicHistory.lastActiveEra[0]).toBe(2);
    expect(a.tectonicHistory.lastActiveEra[1]).toBe(2);
  });
});

