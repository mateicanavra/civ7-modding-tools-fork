import { describe, expect, it } from "bun:test";
import { computeFlowRoutingPriorityFlood } from "@mapgen/lib/grid/flow-routing.js";

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

function walkToWater(options: {
  start: number;
  flowDir: Int32Array;
  landMask: Uint8Array;
  maxSteps?: number;
}): void {
  const { start, flowDir, landMask } = options;
  const maxSteps = options.maxSteps ?? landMask.length + 5;

  const seen = new Uint8Array(landMask.length);
  let cur = start;

  for (let step = 0; step < maxSteps; step++) {
    if (landMask[cur] !== 1) return;
    if (seen[cur] === 1) throw new Error("cycle detected");
    seen[cur] = 1;

    const next = flowDir[cur] ?? -1;
    if (next < 0 || next >= landMask.length) throw new Error("routing terminated before reaching water");
    cur = next;
  }

  throw new Error("routing did not reach water within step limit");
}

describe("flow routing: priority flood", () => {
  it("routes a flat landmass to surrounding water (no sinks)", () => {
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

    const first = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask });
    const second = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask });
    expect(Array.from(first.flowDir)).toEqual(Array.from(second.flowDir));

    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;
      expect(first.flowDir[i]).not.toBe(-1);
      walkToWater({ start: i, flowDir: first.flowDir, landMask });
    }
  });

  it("eliminates sinks in a simple depression (pit) case", () => {
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

    // Create a pit surrounded by higher terrain.
    const pit = idx(2, 3, width);
    elevation[pit] = 0;
    elevation[idx(2, 2, width)] = 15;
    elevation[idx(1, 3, width)] = 15;
    elevation[idx(3, 3, width)] = 15;
    elevation[idx(2, 4, width)] = 15;

    const routing = computeFlowRoutingPriorityFlood({ width, height, elevation, landMask });
    expect(routing.flowDir[pit]).not.toBe(-1);
    walkToWater({ start: pit, flowDir: routing.flowDir, landMask });
  });
});

