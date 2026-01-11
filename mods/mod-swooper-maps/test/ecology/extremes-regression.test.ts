import { describe, expect, it } from "bun:test";

import classifyBiomes from "../../src/domain/ecology/ops/classify-biomes/index.js";
import planVegetation from "../../src/domain/ecology/ops/features-plan-vegetation/index.js";
import planWetlands from "../../src/domain/ecology/ops/features-plan-wetlands/index.js";
import { runOpValidated } from "../support/compiler-helpers.js";

describe("ecology defaults regression", () => {
  it("does not freeze all oceans by default", () => {
    const result = runOpValidated(
      classifyBiomes,
      {
        width: 2,
        height: 1,
        rainfall: new Uint8Array([0, 0]),
        humidity: new Uint8Array([0, 0]),
        elevation: new Int16Array([0, 0]),
        latitude: new Float32Array([0, 60]),
        landMask: new Uint8Array([0, 0]),
        corridorMask: new Uint8Array([0, 0]),
        riftShoulderMask: new Uint8Array([0, 0]),
      },
      { strategy: "default", config: {} }
    );

    expect(result.surfaceTemperature[0]).toBeGreaterThan(result.surfaceTemperature[1]);
  });

  it("does not place marsh everywhere at typical moisture", () => {
    const result = runOpValidated(
      planWetlands,
      {
        width: 1,
        height: 1,
        landMask: new Uint8Array([1]),
        effectiveMoisture: new Float32Array([120]),
        surfaceTemperature: new Float32Array([15]),
        fertility: new Float32Array([0.1]),
        elevation: new Int16Array([0]),
      },
      { strategy: "default", config: {} }
    );

    expect(result.placements).toHaveLength(0);
  });

  it("treats effectiveMoisture in consistent units for vegetation weights", () => {
    const result = runOpValidated(
      planVegetation,
      {
        width: 1,
        height: 1,
        biomeIndex: new Uint8Array([4]),
        vegetationDensity: new Float32Array([0.6]),
        effectiveMoisture: new Float32Array([120]),
        surfaceTemperature: new Float32Array([15]),
        fertility: new Float32Array([0]),
        landMask: new Uint8Array([1]),
      },
      { strategy: "default", config: {} }
    );

    expect(result.placements).toHaveLength(1);
    const weight = result.placements[0]?.weight;
    expect(typeof weight).toBe("number");
    expect(Number.isFinite(weight!)).toBe(true);
    expect(weight!).toBeLessThan(0.95);
  });
});
