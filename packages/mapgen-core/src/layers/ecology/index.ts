import type { ExtendedMapContext } from "../../core/types.js";
import { syncHeightfield } from "../../core/types.js";
import { DEV, logBiomeSummary } from "../../dev/index.js";
import { M3_STANDARD_STAGE_PHASE, type StepRegistry } from "../../pipeline/index.js";
import { createLegacyBiomesStep, createLegacyFeaturesStep } from "../../steps/index.js";

export interface EcologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
}

export function registerEcologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: EcologyLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register(
    createLegacyBiomesStep({
      ...runtime.getStageDescriptor("biomes"),
      shouldRun: () => stageFlags.biomes,
      afterRun: (context) => {
        const { width, height } = context.dimensions;
        if (DEV.ENABLED && context?.adapter) {
          logBiomeSummary(context.adapter, width, height);
        }
      },
    })
  );

  registry.register(
    createLegacyFeaturesStep({
      ...runtime.getStageDescriptor("features"),
      shouldRun: () => stageFlags.features,
      afterRun: (context) => {
        context.adapter.validateAndFixTerrain();
        syncHeightfield(context);
        context.adapter.recalculateAreas();
      },
    })
  );
}

