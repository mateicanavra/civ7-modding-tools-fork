import type { ExtendedMapContext } from "../../core/types.js";
import { assertFoundationContext } from "../../core/assertions.js";
import { DEV, logVolcanoSummary } from "../../dev/index.js";
import type { VolcanoesConfig } from "../../bootstrap/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import { layerAddVolcanoesPlateAware } from "./volcanoes.js";

export interface VolcanoesStepRuntime {
  volcanoOptions: VolcanoesConfig;
}

export interface VolcanoesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createVolcanoesStep(
  runtime: VolcanoesStepRuntime,
  options: VolcanoesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "volcanoes",
    phase: M3_STANDARD_STAGE_PHASE.volcanoes,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      assertFoundationContext(context, "volcanoes");
      const { width, height } = context.dimensions;

      layerAddVolcanoesPlateAware(context, runtime.volcanoOptions);

      if (DEV.ENABLED && context?.adapter) {
        const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
        logVolcanoSummary(context.adapter, width, height, volcanoId);
      }
    },
  };
}

