<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts
import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationPlates } from "@mapgen/core/assertions.js";
import { DEV, logVolcanoSummary } from "@mapgen/dev/index.js";
import type { VolcanoesConfig } from "@mapgen/bootstrap/types.js";
import { VolcanoesConfigSchema } from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { layerAddVolcanoesPlateAware } from "@mapgen/domain/morphology/volcanoes/index.js";

export interface VolcanoesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const VolcanoesStepConfigSchema = Type.Object(
  {
    volcanoes: VolcanoesConfigSchema,
  },
  { additionalProperties: false, default: { volcanoes: {} } }
);

type VolcanoesStepConfig = Static<typeof VolcanoesStepConfigSchema>;

export function createVolcanoesStep(
  options: VolcanoesStepOptions
): MapGenStep<ExtendedMapContext, VolcanoesStepConfig> {
  return {
    id: "volcanoes",
    phase: M3_STANDARD_STAGE_PHASE.volcanoes,
    requires: options.requires,
    provides: options.provides,
    configSchema: VolcanoesStepConfigSchema,
    run: (context, config) => {
      assertFoundationPlates(context, "volcanoes");
      const { width, height } = context.dimensions;
      const volcanoOptions = (config.volcanoes ?? {}) as VolcanoesConfig;

      layerAddVolcanoesPlateAware(context, volcanoOptions);

      if (DEV.ENABLED && context?.adapter) {
        const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
        logVolcanoSummary(context.adapter, width, height, volcanoId);
      }
    },
  };
}
========
export { createVolcanoesStep } from "@mapgen/base/pipeline/morphology/VolcanoesStep.js";
export type { VolcanoesStepOptions } from "@mapgen/base/pipeline/morphology/VolcanoesStep.js";

>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/morphology/VolcanoesStep.ts
