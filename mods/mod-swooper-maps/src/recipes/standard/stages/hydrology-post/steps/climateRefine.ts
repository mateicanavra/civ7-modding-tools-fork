import { logRainfallStats, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import {
  type FoundationDirectionalityConfig,
} from "@mapgen/domain/config";
import {
} from "../../../artifacts.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";
import ClimateRefineStepContract from "./climateRefine.contract.js";
type ClimateRefineStepConfig = Static<typeof ClimateRefineStepContract.schema>;

export default createStep(ClimateRefineStepContract, {
  run: (context: ExtendedMapContext, config: ClimateRefineStepConfig, _ops, deps) => {
    const { width, height } = context.dimensions;
    const directionality = context.env.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("climate-refine requires env.directionality.");
    }
    const rifts = deps.artifacts.motifsRifts.read(context);
    const hotspots = deps.artifacts.motifsHotspots.read(context);
    const riverAdjacency = deps.artifacts.riverAdjacency.read(context);
    refineClimateEarthlike(width, height, context, {
      climate: config.climate,
      story: config.story,
      directionality,
      rifts,
      hotspots,
      riverAdjacency,
    });

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
});
