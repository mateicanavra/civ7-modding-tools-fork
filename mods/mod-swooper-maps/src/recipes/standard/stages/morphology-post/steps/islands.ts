import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  ctxRandom,
  ctxRandomLabel,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import IslandsStepContract from "./islands.contract.js";

type OverlayMasks = {
  seaLanes: Uint8Array;
  activeMargin: Uint8Array;
  passiveShelf: Uint8Array;
  hotspots: Uint8Array;
};

function buildEmptyMasks(width: number, height: number): OverlayMasks {
  const mask = new Uint8Array(width * height);
  return {
    seaLanes: mask,
    activeMargin: mask,
    passiveShelf: mask,
    hotspots: mask,
  };
}

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

export default createStep(IslandsStepContract, {
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;
    const stepId = `${IslandsStepContract.phase}/${IslandsStepContract.id}`;

    const masks = buildEmptyMasks(width, height);
    const fractal = buildFractalArray(context, width, height, 1, 5);

    const plan = ops.islands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        seaLaneMask: masks.seaLanes,
        activeMarginMask: masks.activeMargin,
        passiveShelfMask: masks.passiveShelf,
        hotspotMask: masks.hotspots,
        fractal,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/plan-island-chains"), 2_147_483_647),
      },
      config.islands
    );

    for (const edit of plan.edits) {
      const index = edit.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const terrain = edit.kind === "peak" ? FLAT_TERRAIN : COAST_TERRAIN;
      const isLand = edit.kind === "peak";
      writeHeightfield(context, x, y, { terrain, isLand });
    }
  },
});
