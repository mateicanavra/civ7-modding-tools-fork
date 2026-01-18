import { describe, expect, it } from "bun:test";
import ecology from "@mapgen/domain/ecology/ops";

import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";

describe("planWetlands delta-focused", () => {
  it("requires both moisture and fertility", () => {
    const width = 4;
    const height = 4;
    const size = width * height;
    const selection = normalizeOpSelectionOrThrow(ecology.ops.planWetlands, {
      strategy: "delta-focused",
      config: {
        moistureThreshold: 0.2,
        fertilityThreshold: 0.35,
        moistureNormalization: 230,
        maxElevation: 1200,
      },
    });

    const baseInput = {
      width,
      height,
      landMask: new Uint8Array(size).fill(1),
      surfaceTemperature: new Float32Array(size).fill(10),
      elevation: new Int16Array(size).fill(100),
    };

    const dryHighFertility = ecology.ops.planWetlands.run(
      {
        ...baseInput,
        effectiveMoisture: new Float32Array(size).fill(1),
        fertility: new Float32Array(size).fill(1),
      },
      selection
    );
    expect(dryHighFertility.placements.length).toBe(0);

    const wetHighFertility = ecology.ops.planWetlands.run(
      {
        ...baseInput,
        effectiveMoisture: new Float32Array(size).fill(230),
        fertility: new Float32Array(size).fill(1),
      },
      selection
    );
    expect(wetHighFertility.placements.length).toBeGreaterThan(0);
  });
});
