import { describe, expect, it } from "bun:test";

import { computeFlowRoutingPriorityFlood, forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { computeLakesFromWaterBalance } from "../../src/recipes/standard/stages/map-hydrology/steps/lakes.js";

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

describe("map-hydrology:lakes (water balance)", () => {
  it("is deterministic and monotonic with runoff on a simple depression fixture", () => {
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

    const pet = new Float32Array(size).fill(3);
    const rainfallAmplitude = new Uint8Array(size).fill(0);

    const runoffLow = new Float32Array(size);
    runoffLow[idx(cx, cy, width)] = 1;

    const runoffHigh = new Float32Array(size);
    runoffHigh[idx(cx, cy, width)] = 8;

    const a = computeLakesFromWaterBalance({
      width,
      height,
      elevation,
      routingElevation: routing.routingElevation,
      flowDir: routing.flowDir,
      landMask,
      waterMask,
      mountainMask,
      runoff: runoffLow,
      pet,
      rainfallAmplitude,
      config: {
        minFillDepthM: 1,
        evapScale: 1,
        seepageLoss: 1,
        seasonalityStrength01: 0,
        permanenceThreshold01: 0.75,
      },
    });

    const a2 = computeLakesFromWaterBalance({
      width,
      height,
      elevation,
      routingElevation: routing.routingElevation,
      flowDir: routing.flowDir,
      landMask,
      waterMask,
      mountainMask,
      runoff: runoffLow,
      pet,
      rainfallAmplitude,
      config: {
        minFillDepthM: 1,
        evapScale: 1,
        seepageLoss: 1,
        seasonalityStrength01: 0,
        permanenceThreshold01: 0.75,
      },
    });

    const b = computeLakesFromWaterBalance({
      width,
      height,
      elevation,
      routingElevation: routing.routingElevation,
      flowDir: routing.flowDir,
      landMask,
      waterMask,
      mountainMask,
      runoff: runoffHigh,
      pet,
      rainfallAmplitude,
      config: {
        minFillDepthM: 1,
        evapScale: 1,
        seepageLoss: 1,
        seasonalityStrength01: 0,
        permanenceThreshold01: 0.75,
      },
    });

    expect(Array.from(a.floodedFraction01)).toEqual(Array.from(a2.floodedFraction01));
    expect(b.floodedFraction01[idx(cx, cy, width)]).toBeGreaterThan(a.floodedFraction01[idx(cx, cy, width)]);
    expect(a.permanentLakeTiles).toBe(0);
    expect(b.permanentLakeTiles).toBe(1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y, width);
        if (b.permanentLakeMask[i] !== 1) continue;
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
