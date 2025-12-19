import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  WorldModel,
  setConfigProvider,
  resetConfigProviderForTest,
} from "../../src/world/model.js";

describe("WorldModel config provider", () => {
  beforeEach(() => {
    resetConfigProviderForTest();
    WorldModel.reset();
  });

  afterEach(() => {
    WorldModel.reset();
    resetConfigProviderForTest();
  });

  it("fails fast when no provider is set", () => {
    const rng = (max: number) => (max > 0 ? 0 : 0);
    expect(() => WorldModel.init({ width: 4, height: 4, rng })).toThrow(
      /configuration provider not set/i
    );
  });

  it("initializes when provider is set", () => {
    setConfigProvider(() => ({
      plates: {
        count: 4,
        convergenceMix: 0.5,
        relaxationSteps: 1,
        plateRotationMultiple: 1,
        seedMode: "engine",
        seedOffset: 0,
      },
      dynamics: {
        mantle: { bumps: 1, amplitude: 0.6, scale: 0.4 },
        wind: { jetStreaks: 0, jetStrength: 1, variance: 0.6 },
      },
      directionality: { cohesion: 0 },
    }));

    const rng = (max: number) => (max > 0 ? 0 : 0);
    const ok = WorldModel.init({ width: 4, height: 4, rng });
    expect(ok).toBe(true);
  });
});
