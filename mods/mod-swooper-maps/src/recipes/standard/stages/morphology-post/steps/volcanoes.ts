import { assertFoundationPlates, logVolcanoSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import type { VolcanoesConfig } from "@mapgen/domain/config";
import { layerAddVolcanoesPlateAware } from "@mapgen/domain/morphology/volcanoes/index.js";
import VolcanoesStepContract from "./volcanoes.contract.js";
type VolcanoesStepConfig = Static<typeof VolcanoesStepContract.schema>;

export default createStep(VolcanoesStepContract, {
  run: (context: ExtendedMapContext, config: VolcanoesStepConfig) => {
    assertFoundationPlates(context, "volcanoes");
    const { width, height } = context.dimensions;
    const volcanoOptions = config.volcanoes as VolcanoesConfig;

    layerAddVolcanoesPlateAware(context, volcanoOptions);

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
  },
});
