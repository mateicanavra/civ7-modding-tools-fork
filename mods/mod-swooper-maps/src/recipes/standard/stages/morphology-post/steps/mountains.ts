import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  logMountainSummary,
  logReliefAscii,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import MountainsStepContract from "./mountains.contract.js";

function buildFractalArray(
  context: Parameters<typeof writeHeightfield>[0],
  width: number,
  height: number,
  fractalId: number,
  grain: number
): Int16Array {
  const fractal = new Int16Array(width * height);
  if (context.adapter?.createFractal && context.adapter?.getFractalHeight) {
    context.adapter.createFractal(fractalId, width, height, grain, 0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        fractal[i] = context.adapter.getFractalHeight(fractalId, x, y) | 0;
      }
    }
  }
  return fractal;
}

export default createStep(MountainsStepContract, {
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;

    const fractalMountain = buildFractalArray(context, width, height, 0, 5);
    const fractalHill = buildFractalArray(context, width, height, 1, 5);

    const plan = ops.mountains(
      {
        width,
        height,
        landMask: heightfield.landMask,
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
        const i = y * width + x;
        if (heightfield.landMask[i] !== 1) continue;
        if (plan.mountainMask[i] === 1) {
          writeHeightfield(context, x, y, { terrain: MOUNTAIN_TERRAIN, isLand: true });
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (heightfield.landMask[i] !== 1) continue;
        if (plan.mountainMask[i] === 1) continue;
        if (plan.hillMask[i] === 1) {
          writeHeightfield(context, x, y, { terrain: HILL_TERRAIN, isLand: true });
        }
      }
    }

    logMountainSummary(context.trace, context.adapter, width, height);
    logReliefAscii(context.trace, context.adapter, width, height);
  },
});
