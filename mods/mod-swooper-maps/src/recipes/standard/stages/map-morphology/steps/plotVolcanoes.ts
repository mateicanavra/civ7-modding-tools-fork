import type { FeatureData } from "@civ7/adapter";
import { MOUNTAIN_TERRAIN, VOLCANO_FEATURE, logVolcanoSummary } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import PlotVolcanoesStepContract from "./plotVolcanoes.contract.js";
import { assertNoWaterDrift } from "./assertions.js";

export default createStep(PlotVolcanoesStepContract, {
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const plan = deps.artifacts.volcanoes.read(context);
    const { width, height } = context.dimensions;

    for (const entry of plan.volcanoes) {
      const index = entry.tileIndex | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      context.adapter.setTerrainType(x, y, MOUNTAIN_TERRAIN);
      const featureData: FeatureData = { Feature: VOLCANO_FEATURE, Direction: -1, Elevation: 0 };
      context.adapter.setFeatureType(x, y, featureData);
    }

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
    assertNoWaterDrift(context, topography.landMask, "map-morphology/plot-volcanoes");
  },
});
