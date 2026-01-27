import { describe, expect, it } from "bun:test";

import { computeFlowRoutingPriorityFlood } from "@swooper/mapgen-core/lib/grid";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { computeOwnedLakes } from "../../src/recipes/standard/stages/map-hydrology/steps/lakes.js";

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

describe("map-hydrology:lakes (owned lakes)", () => {
  it("projects lakes into filled depressions deterministically (and avoids coastal adjacency)", () => {
    const width = 11;
    const height = 9;
    const size = width * height;

    const elevation = new Int16Array(size);
    const landMask = new Uint8Array(size);
    const waterMask = new Uint8Array(size);
    const mountainMask = new Uint8Array(size);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y, width);
        const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        landMask[i] = isBorder ? 0 : 1;
        waterMask[i] = isBorder ? 1 : 0;
        elevation[i] = 0;
      }
    }

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    elevation[idx(cx, cy, width)] = -10;

    const routing = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask });

    const a = computeOwnedLakes({
      width,
      height,
      seed: 123,
      targetLakeCount: 1,
      elevation,
      routingElevation: routing.routingElevation,
      landMask,
      waterMask,
      mountainMask,
    });
    const b = computeOwnedLakes({
      width,
      height,
      seed: 123,
      targetLakeCount: 1,
      elevation,
      routingElevation: routing.routingElevation,
      landMask,
      waterMask,
      mountainMask,
    });

    expect(a.lakeCount).toBe(1);
    expect(a.lakeTileCount).toBeGreaterThan(0);
    expect(a.lakeTileCount).toBeLessThanOrEqual(16);
    expect(a.meanFillDepth).toBeGreaterThan(1);

    expect(Array.from(a.lakeMask)).toEqual(Array.from(b.lakeMask));
    expect(a.lakeMask[idx(cx, cy, width)]).toBe(1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y, width);
        if (a.lakeMask[i] !== 1) continue;
        let adjacentToWater = false;
        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          const ni = idx(nx, ny, width);
          if (waterMask[ni] === 1) adjacentToWater = true;
        });
        expect(adjacentToWater).toBe(false);
      }
    }
  });
});

