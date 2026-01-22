import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  computeSampleStep,
  logMountainSummary,
  logReliefAscii,
  renderAsciiGrid,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { PerlinNoise } from "@swooper/mapgen-core/lib/noise";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";
import PlotMountainsStepContract from "./plotMountains.contract.js";
import { assertNoWaterDrift } from "./assertions.js";
import {
  MORPHOLOGY_OROGENY_HILL_THRESHOLD_DELTA,
  MORPHOLOGY_OROGENY_MOUNTAIN_THRESHOLD_DELTA,
  MORPHOLOGY_OROGENY_TECTONIC_INTENSITY_MULTIPLIER,
} from "@mapgen/domain/morphology/shared/knob-multipliers.js";
import type { MorphologyOrogenyKnob } from "@mapgen/domain/morphology/shared/knobs.js";

function buildFractalArray(
  width: number,
  height: number,
  seed: number,
  grain: number
): Int16Array {
  const fractal = new Int16Array(width * height);
  const perlin = new PerlinNoise(seed | 0);
  const scale = 1 / Math.max(1, Math.round(grain));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const noise = perlin.noise2D(x * scale, y * scale);
      const normalized = Math.max(0, Math.min(1, (noise + 1) / 2));
      fractal[i] = Math.round(normalized * 255);
    }
  }
  return fractal;
}

function clampNumber(value: number, bounds: { min: number; max?: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, value));
}

export default createStep(PlotMountainsStepContract, {
  normalize: (config, ctx) => {
    const { orogeny } = ctx.knobs as Readonly<{ orogeny?: MorphologyOrogenyKnob }>;
    const multiplier = MORPHOLOGY_OROGENY_TECTONIC_INTENSITY_MULTIPLIER[orogeny ?? "normal"] ?? 1.0;
    const mountainThresholdDelta = MORPHOLOGY_OROGENY_MOUNTAIN_THRESHOLD_DELTA[orogeny ?? "normal"] ?? 0;
    const hillThresholdDelta = MORPHOLOGY_OROGENY_HILL_THRESHOLD_DELTA[orogeny ?? "normal"] ?? 0;

    const mountainsSelection =
      config.mountains.strategy === "default"
        ? {
            ...config.mountains,
            config: {
              ...config.mountains.config,
              tectonicIntensity: clampNumber(config.mountains.config.tectonicIntensity * multiplier, { min: 0 }),
              mountainThreshold: clampNumber(config.mountains.config.mountainThreshold + mountainThresholdDelta, {
                min: 0,
              }),
              hillThreshold: clampNumber(config.mountains.config.hillThreshold + hillThresholdDelta, { min: 0 }),
            },
          }
        : config.mountains;

    return { ...config, mountains: mountainsSelection };
  },
  run: (context, config, ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const baseSeed = deriveStepSeed(context.env.seed, "morphology:planMountains");

    const fractalMountain = buildFractalArray(width, height, baseSeed ^ 0x3d, 5);
    const fractalHill = buildFractalArray(width, height, baseSeed ^ 0x5f, 5);

    const plan = ops.mountains(
      {
        width,
        height,
        landMask: topography.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
        tectonicStress: plates.tectonicStress,
        fractalMountain,
        fractalHill,
      },
      config.mountains
    );

    context.trace.event(() => {
      const size = Math.max(0, (width | 0) * (height | 0));
      let landTiles = 0;
      let mountainTiles = 0;
      let hillTiles = 0;
      for (let i = 0; i < size; i++) {
        if (topography.landMask[i] !== 1) continue;
        landTiles += 1;
        if (plan.mountainMask[i] === 1) mountainTiles += 1;
        if (plan.hillMask[i] === 1) hillTiles += 1;
      }
      return {
        kind: "morphology.mountains.summary",
        landTiles,
        mountainTiles,
        hillTiles,
      };
    });
    context.trace.event(() => {
      const sampleStep = computeSampleStep(width, height);
      const rows = renderAsciiGrid({
        width,
        height,
        sampleStep,
        cellFn: (x, y) => {
          const idx = y * width + x;
          const base = topography.landMask[idx] === 1 ? "." : "~";
          const overlay =
            plan.mountainMask[idx] === 1 ? "M" : plan.hillMask[idx] === 1 ? "h" : undefined;
          return { base, overlay };
        },
      });
      return {
        kind: "morphology.mountains.ascii.reliefMask",
        sampleStep,
        legend: ".=land ~=water M=mountain h=hill",
        rows,
      };
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (topography.landMask[idx] !== 1) continue;
        if (plan.mountainMask[idx] === 1) {
          context.adapter.setTerrainType(x, y, MOUNTAIN_TERRAIN);
          continue;
        }
        if (plan.hillMask[idx] === 1) {
          context.adapter.setTerrainType(x, y, HILL_TERRAIN);
        }
      }
    }

    logMountainSummary(context.trace, context.adapter, width, height);
    logReliefAscii(context.trace, context.adapter, width, height);
    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-mountains");
  },
});
