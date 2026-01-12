import {
  markLandmassId,
  logElevationSummary,
  resolveLandmassIds,
  syncHeightfield,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import {
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
} from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";
import ClimateBaselineStepContract from "./climateBaseline.contract.js";
type ClimateBaselineStepConfig = Static<typeof ClimateBaselineStepContract.schema>;

export default createStep(ClimateBaselineStepContract, {
  run: (context: ExtendedMapContext, config: ClimateBaselineStepConfig) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const landmassIds = resolveLandmassIds(context.adapter);

    context.adapter.recalculateAreas();
    context.adapter.buildElevation();

    const westRestamped = markLandmassId(
      runtime.westContinent,
      landmassIds.WEST,
      context.adapter
    );
    const eastRestamped = markLandmassId(
      runtime.eastContinent,
      landmassIds.EAST,
      context.adapter
    );
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "landmass.regionIds.refresh",
        westRestamped,
        eastRestamped,
        ids: { west: landmassIds.WEST, east: landmassIds.EAST },
      }));
    }

    syncHeightfield(context);
    logElevationSummary(context.trace, context.adapter, width, height, "post-buildElevation");
    publishHeightfieldArtifact(context);
    applyClimateBaseline(width, height, context, config.climate);
    publishClimateFieldArtifact(context);
  },
});
