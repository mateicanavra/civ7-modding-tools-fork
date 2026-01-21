import { createStep } from "@swooper/mapgen-core/authoring";
import PlotContinentsStepContract from "./plotContinents.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(PlotContinentsStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);

    context.adapter.validateAndFixTerrain();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-continents");
  },
});
