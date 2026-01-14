import { logRainfallStats } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";
import { readOverlayMotifsHotspots, readOverlayMotifsRifts } from "../../../overlays.js";
import ClimateRefineStepContract from "./climateRefine.contract.js";

export default createStep(ClimateRefineStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const windField = deps.artifacts.windField.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const rifts = readOverlayMotifsRifts(overlays);
    const hotspots = readOverlayMotifsHotspots(overlays);
    const riverAdjacency = deps.artifacts.riverAdjacency.read(context);
    refineClimateEarthlike(width, height, context, {
      climate: config.climate,
      story: config.story,
      wind: windField,
      rifts,
      hotspots,
      riverAdjacency,
    });

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
});
