import { describe, expect, it } from "bun:test";

import { defaultStrategy } from "../src/domain/hydrology/ops/project-river-network/strategies/default.js";

describe("hydrology/project-river-network (default strategy)", () => {
  it("produces no rivers when all land discharge is zero", () => {
    const width = 4;
    const height = 3;
    const size = width * height;

    const out = defaultStrategy.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        discharge: new Float32Array(size).fill(0),
      },
      {
        minorPercentile: 0.85,
        majorPercentile: 0.95,
        minMinorDischarge: 0,
        minMajorDischarge: 0,
      }
    );

    expect(Array.from(out.riverClass)).toEqual(new Array(size).fill(0));
    expect(out.minorThreshold).toBe(0);
    expect(out.majorThreshold).toBe(0);
  });

  it("does not classify zero-discharge land as rivers when thresholds are derived from positives", () => {
    const width = 4;
    const height = 3;
    const size = width * height;

    const discharge = new Float32Array(size).fill(0);
    discharge[0] = 10;

    const out = defaultStrategy.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        discharge,
      },
      {
        minorPercentile: 0.85,
        majorPercentile: 0.95,
        minMinorDischarge: 0,
        minMajorDischarge: 0,
      }
    );

    expect(out.minorThreshold).toBe(10);
    expect(out.majorThreshold).toBe(10);
    expect(out.riverClass[0]).toBe(2);
    expect(Array.from(out.riverClass.slice(1))).toEqual(new Array(size - 1).fill(0));
  });
});
