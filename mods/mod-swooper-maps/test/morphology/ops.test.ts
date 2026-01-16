import { describe, expect, it } from "bun:test";

import morphologyDomain from "../../src/domain/morphology/ops.js";
import { normalizeStrictOrThrow, runOpValidated } from "../support/compiler-helpers.js";

const { computeLandmasses } = morphologyDomain.ops;

describe("morphology operations", () => {
  it("computes landmass components and validates output", () => {
    const width = 4;
    const height = 3;
    const landMask = new Uint8Array([
      1, 1, 0, 0,
      1, 0, 0, 1,
      0, 0, 1, 1,
    ]);

    const result = runOpValidated(
      computeLandmasses,
      { width, height, landMask },
      { strategy: "default", config: {} }
    );

    normalizeStrictOrThrow(computeLandmasses.output, result, "/ops/morphology/compute-landmasses/output");
    expect(result.landmasses.length).toBeGreaterThan(0);
    expect(result.landmassIdByTile.length).toBe(width * height);
    expect(result.landmassIdByTile[2]).toBe(-1);
  });
});
