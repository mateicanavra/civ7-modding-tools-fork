import { HILL_TERRAIN, MOUNTAIN_TERRAIN, logMountainSummary, logReliefAscii } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { PerlinNoise } from "@swooper/mapgen-core/lib/noise";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";
import PlotMountainsStepContract from "./plotMountains.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

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

export default createStep(PlotMountainsStepContract, {
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
