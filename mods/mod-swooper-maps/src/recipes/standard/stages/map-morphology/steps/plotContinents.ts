import { logLandmassAscii } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import PlotContinentsStepContract from "./plotContinents.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(PlotContinentsStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;

    context.adapter.validateAndFixTerrain();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    logLandmassAscii(context.trace, context.adapter, width, height);
    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-continents");
  },
});
