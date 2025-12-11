import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { WorldModel, setConfigProvider } from "../../src/world/model.js";

describe("WorldModel config provider", () => {
  beforeEach(() => {
    WorldModel.reset();
  });

  afterEach(() => {
    WorldModel.reset();
  });

  it("fails fast when no provider is set", () => {
    expect(() => WorldModel.init({ width: 4, height: 4 })).toThrow(
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

    const ok = WorldModel.init({ width: 4, height: 4 });
    expect(ok).toBe(true);
  });
});
