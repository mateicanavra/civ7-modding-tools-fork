import { describe, it, expect } from "bun:test";
import { FoundationDirectionalityConfigSchema } from "@mapgen/domain/config";
import { planPlotEffects } from "../../src/domain/ecology/ops/plan-plot-effects/index.js";
import { BIOME_SYMBOL_TO_INDEX } from "../../src/domain/ecology/types.js";
import { normalizeOpSelectionOrThrow, normalizeStrictOrThrow } from "../support/compiler-helpers.js";

const createInput = () => {
  const width = 2;
  const height = 2;
  const size = width * height;

  return {
    width,
    height,
    seed: 0,
    biomeIndex: new Uint8Array(size).fill(BIOME_SYMBOL_TO_INDEX.tundra ?? 1),
    vegetationDensity: new Float32Array(size).fill(0.1),
    effectiveMoisture: new Float32Array(size).fill(120),
    surfaceTemperature: new Float32Array(size).fill(-6),
    aridityIndex: new Float32Array(size).fill(0.2),
    freezeIndex: new Float32Array(size).fill(0.95),
    elevation: new Int16Array(size).fill(2400),
    landMask: new Uint8Array(size).fill(1),
  };
};

describe("plot effects (owned)", () => {
  it("places permanent snow plot effects when thresholds pass", () => {
    const input = createInput();
    const directionality = normalizeStrictOrThrow(
      FoundationDirectionalityConfigSchema,
      {},
      "/env/directionality"
    );
    const env = {
      seed: 0,
      dimensions: { width: input.width, height: input.height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
      wrap: { wrapX: false, wrapY: false },
      directionality,
    };
    const selection = normalizeOpSelectionOrThrow(
      planPlotEffects,
      {
        strategy: "default",
        config: {
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
        },
      },
      { ctx: { env, knobs: {} }, path: "/ops/planPlotEffects" }
    );
    const result = planPlotEffects.run(input, selection);

    expect(result.placements.length).toBeGreaterThan(0);
    const anySnow = result.placements.some((placement) =>
      placement.plotEffect.startsWith("PLOTEFFECT_SNOW_")
    );
    expect(anySnow).toBe(true);
  });
});
