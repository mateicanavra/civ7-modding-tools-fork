import { describe, expect, it } from "bun:test";

import { planVegetatedFeaturePlacements } from "@mapgen/domain/ecology/ops/plan-vegetated-feature-placements/index.js";

describe("baseline feature placement config", () => {
  it("rejects unknown chance keys", () => {
    const input = {
      width: 1,
      height: 1,
      seed: 0,
      biomeIndex: new Uint8Array([4]),
      vegetationDensity: new Float32Array([0.5]),
      effectiveMoisture: new Float32Array([120]),
      surfaceTemperature: new Float32Array([15]),
      aridityIndex: new Float32Array([0.3]),
      freezeIndex: new Float32Array([0.1]),
      landMask: new Uint8Array([1]),
      terrainType: new Uint8Array([0]),
      featureKeyField: new Int16Array([-1]),
      navigableRiverTerrain: -1,
    };

    const config = {
      strategy: "default",
      config: {
        chances: {
          FEATURE_FAKE_FEATURE: 20,
        },
      },
    } as unknown as Parameters<typeof planVegetatedFeaturePlacements.validate>[1];

    const result = planVegetatedFeaturePlacements.validate(input, config);
    expect(result.ok).toBe(false);
  });
});

