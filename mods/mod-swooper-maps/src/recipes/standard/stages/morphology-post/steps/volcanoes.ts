import { logVolcanoSummary } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { VolcanoesConfig } from "@mapgen/domain/config";
import { layerAddVolcanoesPlateAware } from "@mapgen/domain/morphology/volcanoes/index.js";
import VolcanoesStepContract from "./volcanoes.contract.js";

export default createStep(VolcanoesStepContract, {
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const volcanoOptions = config.volcanoes as VolcanoesConfig;

    layerAddVolcanoesPlateAware(context, plates, volcanoOptions);

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
  },
});
