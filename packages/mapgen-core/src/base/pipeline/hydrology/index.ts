import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import {
  createClimateBaselineStep,
  createClimateRefineStep,
  createLakesStep,
  createRiversStep,
} from "@mapgen/base/pipeline/hydrology/steps.js";

export interface HydrologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  logPrefix: string;
  storyEnabled: boolean;
  mapInfo: MapInfo;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export function registerHydrologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: HydrologyLayerRuntime
): void {
  registry.register(
    createLakesStep(
      { mapInfo: runtime.mapInfo },
      {
        ...runtime.getStageDescriptor("lakes"),
      }
    )
  );

  registry.register(
    createClimateBaselineStep(
      { westContinent: runtime.westContinent, eastContinent: runtime.eastContinent },
      {
        ...runtime.getStageDescriptor("climateBaseline"),
      }
    )
  );

  registry.register(
    createRiversStep({
      ...runtime.getStageDescriptor("rivers"),
      logPrefix: runtime.logPrefix,
      storyEnabled: runtime.storyEnabled,
    })
  );

  registry.register(
    createClimateRefineStep({
      ...runtime.getStageDescriptor("climateRefine"),
    })
  );
}
