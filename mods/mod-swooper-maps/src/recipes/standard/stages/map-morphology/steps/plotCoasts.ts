import { FLAT_TERRAIN, OCEAN_TERRAIN, logLandmassAscii } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import PlotCoastsStepContract from "./plotCoasts.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(PlotCoastsStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const terrain = topography.landMask[idx] === 1 ? FLAT_TERRAIN : OCEAN_TERRAIN;
        context.adapter.setTerrainType(x, y, terrain);
      }
    }

    // Adapter-only mutation: expandCoasts updates engine terrain without syncing buffers.
    context.adapter.expandCoasts(width, height);

    logLandmassAscii(context.trace, context.adapter, width, height);
    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-coasts");
  },
});
