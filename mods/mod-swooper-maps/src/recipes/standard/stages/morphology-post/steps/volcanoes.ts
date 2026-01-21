import type { FeatureData } from "@civ7/adapter";
import {
  MOUNTAIN_TERRAIN,
  VOLCANO_FEATURE,
  ctxRandom,
  ctxRandomLabel,
  logVolcanoSummary,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import VolcanoesStepContract from "./volcanoes.contract.js";

function buildEmptyMask(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

export default createStep(VolcanoesStepContract, {
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;
    const stepId = `${VolcanoesStepContract.phase}/${VolcanoesStepContract.id}`;

    const hotspotMask = buildEmptyMask(width, height);

    const plan = ops.volcanoes(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        shieldStability: plates.shieldStability,
        hotspotMask,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/plan-volcanoes"), 2_147_483_647),
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
