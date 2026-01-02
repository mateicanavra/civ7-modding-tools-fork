import { describe, it, expect } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { plotEffects } from "../../src/domain/ecology/ops/plot-effects/index.js";
import { BIOME_SYMBOL_TO_INDEX } from "../../src/domain/ecology/types.js";

const createInput = () => {
  const width = 2;
  const height = 2;
  const size = width * height;
  const adapter = createMockAdapter({ width, height, rng: () => 0 });
  adapter.fillWater(false);

  return {
    width,
    height,
    adapter,
    biomeIndex: new Uint8Array(size).fill(BIOME_SYMBOL_TO_INDEX.tundra ?? 1),
    vegetationDensity: new Float32Array(size).fill(0.1),
    effectiveMoisture: new Float32Array(size).fill(120),
    surfaceTemperature: new Float32Array(size).fill(-6),
    aridityIndex: new Float32Array(size).fill(0.2),
    freezeIndex: new Float32Array(size).fill(0.95),
    elevation: new Int16Array(size).fill(2400),
    rand: (_label: string, max: number) => 0 % max,
  };
};

describe("plot effects (owned)", () => {
  it("places permanent snow plot effects when thresholds pass", () => {
    const input = createInput();
    const result = plotEffects.run(input, {
      snow: {
        enabled: true,
        elevationStrategy: "percentile",
        elevationPercentileMin: 0,
        elevationPercentileMax: 1,
        elevationMin: 0,
        elevationMax: 3000,
        coverageChance: 100,
        lightThreshold: 0.1,
        mediumThreshold: 0.2,
        heavyThreshold: 0.3,
      },
      sand: { enabled: false },
      burned: { enabled: false },
    });

    expect(result.placements.length).toBeGreaterThan(0);
    const anySnow = result.placements.some((placement) => placement.plotEffectType >= 0);
    expect(anySnow).toBe(true);
  });
});
