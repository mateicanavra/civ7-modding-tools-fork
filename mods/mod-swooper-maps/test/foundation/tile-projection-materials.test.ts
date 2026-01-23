import { describe, it, expect } from "bun:test";
import { HEX_WIDTH } from "@swooper/mapgen-core/lib/grid";
import computePlatesTensors from "../../src/domain/foundation/ops/compute-plates-tensors/index.js";

describe("foundation tile projection (materials)", () => {
  it("projects tileToCellIndex with wrapX and deterministic tie-breakers", () => {
    const width = 2;
    const height = 1;
    const wrapWidth = width * HEX_WIDTH;

    const mesh = {
      cellCount: 4,
      wrapWidth,
      siteX: new Float32Array([wrapWidth - 0.05, wrapWidth - 0.05, HEX_WIDTH, 0.2]),
      siteY: new Float32Array([0, 0, 0, 0]),
      neighborsOffsets: new Int32Array([0, 0, 0, 0, 0]),
      neighbors: new Int32Array([]),
      areas: new Float32Array([1, 1, 1, 1]),
      bbox: { xl: 0, xr: wrapWidth, yt: 0, yb: 1 },
    } as const;

    const crust = {
      type: new Uint8Array([1, 0, 0, 0]),
      age: new Uint8Array([200, 10, 20, 30]),
    } as const;

    const plateGraph = {
      cellToPlate: new Int16Array([0, 0, 0, 0]),
      plates: [
        { id: 0, role: "tectonic", kind: "major", seedX: 0, seedY: 0, velocityX: 0, velocityY: 0, rotation: 0 },
      ],
    } as const;

    const tectonics = {
      boundaryType: new Uint8Array(4),
      upliftPotential: new Uint8Array(4),
      riftPotential: new Uint8Array(4),
      shearStress: new Uint8Array(4),
      volcanism: new Uint8Array(4),
      fracture: new Uint8Array(4),
      cumulativeUplift: new Uint8Array(4),
    } as const;

    const first = computePlatesTensors.run(
      { width, height, mesh: mesh as any, crust: crust as any, plateGraph: plateGraph as any, tectonics: tectonics as any },
      computePlatesTensors.defaultConfig
    );

    const second = computePlatesTensors.run(
      { width, height, mesh: mesh as any, crust: crust as any, plateGraph: plateGraph as any, tectonics: tectonics as any },
      computePlatesTensors.defaultConfig
    );

    expect(Array.from(first.tileToCellIndex)).toEqual(Array.from(second.tileToCellIndex));
    expect(Array.from(first.crustTiles.type)).toEqual(Array.from(second.crustTiles.type));
    expect(Array.from(first.crustTiles.age)).toEqual(Array.from(second.crustTiles.age));

    expect(first.tileToCellIndex.length).toBe(width * height);
    expect(first.tileToCellIndex[0]).toBe(0);
    expect(first.tileToCellIndex[1]).toBe(2);

    expect(first.crustTiles.type.length).toBe(width * height);
    expect(first.crustTiles.age.length).toBe(width * height);
    expect(first.crustTiles.type[0]).toBe(1);
    expect(first.crustTiles.age[0]).toBe(200);
    expect(first.crustTiles.type[1]).toBe(0);
    expect(first.crustTiles.age[1]).toBe(20);
  });
});
