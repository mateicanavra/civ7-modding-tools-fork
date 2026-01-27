import { describe, expect, it } from "bun:test";

import { computeFlowRoutingPriorityFlood, selectFlowReceiver } from "@swooper/mapgen-core/lib/grid";
import { defaultStrategy as accumulateDischarge } from "../../src/domain/hydrology/ops/accumulate-discharge/strategies/default.js";
import { defaultStrategy as projectRiverNetwork } from "../../src/domain/hydrology/ops/project-river-network/strategies/default.js";

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

function computeLegacySteepestDescent(options: {
  width: number;
  height: number;
  elevation: Int16Array;
  landMask: Uint8Array;
}): Int32Array {
  const { width, height, elevation, landMask } = options;
  const size = width * height;
  const flowDir = new Int32Array(size);
  for (let i = 0; i < size; i++) flowDir[i] = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (landMask[i] !== 1) continue;
      flowDir[i] = selectFlowReceiver(x, y, width, height, elevation);
    }
  }

  return flowDir;
}

function countMask(mask: Uint8Array, predicate: (v: number) => boolean): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (predicate(mask[i] ?? 0)) n++;
  return n;
}

describe("hydrology: A/B routing impact (legacy vs priority-flood)", () => {
  it("reduces sinks and increases derived river network signal on a flat interior fixture", () => {
    const width = 7;
    const height = 7;
    const size = width * height;

    const elevation = new Int16Array(size);
    const landMask = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y, width);
        elevation[i] = 0;
        const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        landMask[i] = isBorder ? 0 : 1;
      }
    }

    const rainfall = new Uint8Array(size);
    const humidity = new Uint8Array(size);
    rainfall.fill(1);
    humidity.fill(0);

    const legacyFlowDir = computeLegacySteepestDescent({ width, height, elevation, landMask });
    const flood = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask });

    const legacy = accumulateDischarge.run(
      { width, height, landMask, flowDir: legacyFlowDir, rainfall, humidity },
      { runoffScale: 1, infiltrationFraction: 0, humidityDampening: 0, minRunoff: 1 }
    );
    const next = accumulateDischarge.run(
      { width, height, landMask, flowDir: flood.flowDir, rainfall, humidity },
      { runoffScale: 1, infiltrationFraction: 0, humidityDampening: 0, minRunoff: 1 }
    );

    const landTiles = countMask(landMask, (v) => v === 1);
    expect(countMask(legacy.sinkMask, (v) => v === 1)).toBe(landTiles);
    expect(countMask(next.sinkMask, (v) => v === 1)).toBe(0);
    expect(countMask(next.outletMask, (v) => v === 1)).toBeGreaterThan(0);

    const legacyRivers = projectRiverNetwork.run(
      { width, height, landMask, discharge: legacy.discharge },
      { minorPercentile: 0.85, majorPercentile: 0.95, minMinorDischarge: 2, minMajorDischarge: 4 }
    );
    const nextRivers = projectRiverNetwork.run(
      { width, height, landMask, discharge: next.discharge },
      { minorPercentile: 0.85, majorPercentile: 0.95, minMinorDischarge: 2, minMajorDischarge: 4 }
    );

    const legacyRiverTiles = countMask(legacyRivers.riverClass, (v) => v > 0);
    const nextRiverTiles = countMask(nextRivers.riverClass, (v) => v > 0);
    expect(legacyRiverTiles).toBe(0);
    expect(nextRiverTiles).toBeGreaterThan(0);
  });
});
