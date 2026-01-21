import { createStep } from "@swooper/mapgen-core/authoring";
import PlotCoastsStepContract from "./plotCoasts.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(PlotCoastsStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        context.adapter.setTerrainType(x, y, heightfield.terrain[idx] ?? 0);
      }
    }

    context.adapter.expandCoasts(width, height);

    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-coasts");
  },
});
