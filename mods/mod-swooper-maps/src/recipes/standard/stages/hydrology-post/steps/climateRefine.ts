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
import { ClimateRefineStepContract } from "./climateRefine.contract.js";

type ClimateRefineStepConfig = Static<typeof ClimateRefineStepContract.schema>;

export default createStep(ClimateRefineStepContract, {
  run: (context: ExtendedMapContext, config: ClimateRefineStepConfig) => {
    const { width, height } = context.dimensions;
    const directionality = context.settings.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("climateRefine requires settings.directionality.");
    }
    const rifts = getPublishedNarrativeMotifsRifts(context);
    if (!rifts) {
      throw new Error("[Hydrology] Missing artifact:narrative.motifs.rifts@v1.");
    }
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    if (!hotspots) {
      throw new Error("[Hydrology] Missing artifact:narrative.motifs.hotspots@v1.");
    }
    const riverAdjacency = getPublishedRiverAdjacency(context);
    if (!riverAdjacency) {
      throw new Error("[Hydrology] Missing artifact:riverAdjacency.");
    }
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
