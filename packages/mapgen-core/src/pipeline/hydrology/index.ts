import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import {
  createClimateBaselineStep,
  createClimateRefineStep,
  createLakesStep,
  createRiversStep,
} from "@mapgen/pipeline/hydrology/steps.js";

export interface HydrologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  logPrefix: string;
  mapInfo: MapInfo;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export function registerHydrologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: HydrologyLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register(
    createLakesStep(
      { mapInfo: runtime.mapInfo },
      {
        ...runtime.getStageDescriptor("lakes"),
        shouldRun: () => stageFlags.lakes,
      }
    )
  );

  registry.register(
    createClimateBaselineStep(
      { westContinent: runtime.westContinent, eastContinent: runtime.eastContinent },
      {
        ...runtime.getStageDescriptor("climateBaseline"),
        shouldRun: () => stageFlags.climateBaseline,
      }
    )
  );

  registry.register(
    createRiversStep({
      ...runtime.getStageDescriptor("rivers"),
      shouldRun: () => stageFlags.rivers,
      logPrefix: runtime.logPrefix,
      shouldRunPaleo: (context) => stageFlags.storySwatches && context.config.climate?.story?.paleo != null,
    })
  );

  registry.register(
    createClimateRefineStep({
      ...runtime.getStageDescriptor("climateRefine"),
      shouldRun: () => stageFlags.climateRefine,
    })
  );
}
