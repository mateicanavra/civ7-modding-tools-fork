import type { FeatureData } from "@civ7/adapter";
import {
  MOUNTAIN_TERRAIN,
  VOLCANO_FEATURE,
  logVolcanoSummary,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import VolcanoesStepContract from "./volcanoes.contract.js";
import { deriveStepSeed } from "../../ecology/steps/helpers/seed.js";

export default createStep(VolcanoesStepContract, {
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;
    const rngSeed = deriveStepSeed(context.env.seed, "morphology:planVolcanoes");

    const plan = ops.volcanoes(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        shieldStability: plates.shieldStability,
        volcanism: plates.volcanism,
        rngSeed,
      },
      config.volcanoes
    );

    for (const entry of plan.volcanoes) {
      const index = entry.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      writeHeightfield(context, x, y, { terrain: MOUNTAIN_TERRAIN, isLand: true });
      const featureData: FeatureData = { Feature: VOLCANO_FEATURE, Direction: -1, Elevation: 0 };
      context.adapter.setFeatureType(x, y, featureData);
    }

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
  },
});
