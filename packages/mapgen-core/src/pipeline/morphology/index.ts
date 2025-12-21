import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds, LandmassConfig, MountainsConfig, VolcanoesConfig } from "@mapgen/bootstrap/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import {
  createCoastlinesStep,
  createIslandsStep,
  createLandmassPlatesStep,
  createMountainsStep,
  createRuggedCoastsStep,
  createVolcanoesStep,
} from "@mapgen/pipeline/morphology/steps.js";

export interface MorphologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  logPrefix: string;
  landmassCfg: LandmassConfig;
  mountainOptions: MountainsConfig;
  volcanoOptions: VolcanoesConfig;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export function registerMorphologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: MorphologyLayerRuntime
): void {
  registry.register(
    createLandmassPlatesStep(
      {
        landmassCfg: runtime.landmassCfg,
        westContinent: runtime.westContinent,
        eastContinent: runtime.eastContinent,
      },
      {
        ...runtime.getStageDescriptor("landmassPlates"),
      }
    )
  );

  registry.register(
    createCoastlinesStep({
      ...runtime.getStageDescriptor("coastlines"),
    })
  );

  registry.register(
    createRuggedCoastsStep({
      ...runtime.getStageDescriptor("ruggedCoasts"),
    })
  );

  registry.register(
    createIslandsStep({
      ...runtime.getStageDescriptor("islands"),
    })
  );

  registry.register(
    createMountainsStep(
      { logPrefix: runtime.logPrefix, mountainOptions: runtime.mountainOptions },
      {
        ...runtime.getStageDescriptor("mountains"),
      }
    )
  );

  registry.register(
    createVolcanoesStep(
      { volcanoOptions: runtime.volcanoOptions },
      {
        ...runtime.getStageDescriptor("volcanoes"),
      }
    )
  );
}
