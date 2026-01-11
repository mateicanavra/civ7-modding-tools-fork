import { describe, expect, it } from "bun:test";

import ecology from "@mapgen/domain/ecology/ops";
import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";

describe("baseline feature placement config", () => {
  it("rejects unknown chance keys via compiler-backed validation", () => {
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

    expect(() =>
      normalizeOpSelectionOrThrow(ecology.ops.planVegetatedFeaturePlacements, {
        strategy: "default",
        config: {
          chances: {
            FEATURE_FAKE_FEATURE: 20,
            FEATURE_FOREST: 0,
            FEATURE_RAINFOREST: 0,
            FEATURE_TAIGA: 0,
            FEATURE_SAVANNA_WOODLAND: 0,
            FEATURE_SAGEBRUSH_STEPPE: 0,
          },
          multiplier: 1,
        },
      })
    ).toThrow(/Unknown key/);

    expect(() => ecology.ops.planVegetatedFeaturePlacements.run(input, ecology.ops.planVegetatedFeaturePlacements.defaultConfig)).not.toThrow();
  });
});
