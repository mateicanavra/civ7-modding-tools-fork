import { logRainfallStats, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import {
  type FoundationDirectionalityConfig,
} from "@mapgen/domain/config";
import {
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsRifts,
  getPublishedRiverAdjacency,
  publishClimateFieldArtifact,
} from "../../../artifacts.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";
import ClimateRefineStepContract from "./climateRefine.contract.js";
type ClimateRefineStepConfig = Static<typeof ClimateRefineStepContract.schema>;

export default createStep(ClimateRefineStepContract, {
  run: (context: ExtendedMapContext, config: ClimateRefineStepConfig) => {
    const { width, height } = context.dimensions;
    const directionality = context.env.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("climate-refine requires env.directionality.");
    }
    const rifts = getPublishedNarrativeMotifsRifts(context);
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    const riverAdjacency = getPublishedRiverAdjacency(context);
    refineClimateEarthlike(width, height, context, {
      climate: config.climate,
      story: config.story,
      directionality,
      rifts,
      hotspots,
      riverAdjacency,
    });
    publishClimateFieldArtifact(context);

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
});
