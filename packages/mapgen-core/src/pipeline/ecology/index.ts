import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import { DEV, logBiomeSummary } from "@mapgen/dev/index.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { createBiomesStep, createFeaturesStep } from "@mapgen/pipeline/ecology/steps.js";

export interface EcologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
}

export function registerEcologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: EcologyLayerRuntime
): void {
  registry.register(
    createBiomesStep({
      ...runtime.getStageDescriptor("biomes"),
      afterRun: (context) => {
        const { width, height } = context.dimensions;
        if (DEV.ENABLED && context?.adapter) {
          logBiomeSummary(context.adapter, width, height);
        }
      },
    })
  );

  registry.register(
    createFeaturesStep({
      ...runtime.getStageDescriptor("features"),
      afterRun: (context) => {
        context.adapter.validateAndFixTerrain();
        syncHeightfield(context);
        context.adapter.recalculateAreas();
      },
    })
  );
}
