import { Type, type Static } from "typebox";
import { assertFoundationPlates, logVolcanoSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { VolcanoesConfig } from "@mapgen/domain/config";
import { MorphologyConfigSchema } from "@mapgen/domain/config";
import { layerAddVolcanoesPlateAware } from "@mapgen/domain/morphology/volcanoes/index.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const VolcanoesStepConfigSchema = Type.Object(
  {
    volcanoes: MorphologyConfigSchema.properties.volcanoes,
  },
  { additionalProperties: false, default: { volcanoes: {} } }
);

type VolcanoesStepConfig = Static<typeof VolcanoesStepConfigSchema>;

export default createStep({
  id: "volcanoes",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: VolcanoesStepConfigSchema,
  run: (context: ExtendedMapContext, config: VolcanoesStepConfig) => {
    assertFoundationPlates(context, "volcanoes");
    const { width, height } = context.dimensions;
    const volcanoOptions = config.volcanoes as VolcanoesConfig;

    layerAddVolcanoesPlateAware(context, volcanoOptions);

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
  },
} as const);
