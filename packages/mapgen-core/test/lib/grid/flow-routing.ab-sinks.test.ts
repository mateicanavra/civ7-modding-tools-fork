import { describe, expect, it } from "bun:test";
import { computeFlowRoutingPriorityFlood, selectFlowReceiver } from "@mapgen/lib/grid/flow-routing.js";

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

function countLandSinks(flowDir: Int32Array, landMask: Uint8Array): number {
  let sinks = 0;
  for (let i = 0; i < landMask.length; i++) {
    if (landMask[i] !== 1) continue;
    if ((flowDir[i] ?? -1) < 0) sinks++;
  }
  return sinks;
}

describe("flow routing: A/B sink reduction", () => {
  it("flat interior: legacy has all land as sinks; priority-flood has none", () => {
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

    const legacy = computeLegacySteepestDescent({ width, height, elevation, landMask });
    const priorityFlood = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask }).flowDir;

    const landTiles = Array.from(landMask).filter((v) => v === 1).length;
    expect(countLandSinks(legacy, landMask)).toBe(landTiles);
    expect(countLandSinks(priorityFlood, landMask)).toBe(0);
  });

  it("pit depression: legacy has sinks; priority-flood has none", () => {
    const width = 5;
    const height = 5;
    const size = width * height;

    const elevation = new Int16Array(size);
    const landMask = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
      elevation[i] = 10;
      landMask[i] = 1;
    }

    // Top row is water outlet.
    for (let x = 0; x < width; x++) landMask[idx(x, 0, width)] = 0;

    // A simple pit (local minimum) in the lower half.
    elevation[idx(2, 3, width)] = 0;

    const legacy = computeLegacySteepestDescent({ width, height, elevation, landMask });
    const priorityFlood = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask }).flowDir;

    expect(countLandSinks(legacy, landMask)).toBeGreaterThan(0);
    expect(countLandSinks(priorityFlood, landMask)).toBe(0);
  });
});

