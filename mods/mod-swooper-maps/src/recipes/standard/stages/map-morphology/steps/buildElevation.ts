import { syncHeightfield } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import BuildElevationStepContract from "./buildElevation.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(BuildElevationStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);

    context.adapter.recalculateAreas();
    context.adapter.buildElevation();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();
    syncHeightfield(context);

    assertNoWaterDrift(context, topography.landMask, "map-morphology/build-elevation");
  },
});
