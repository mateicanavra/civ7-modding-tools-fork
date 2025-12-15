import type { ExtendedMapContext } from "../../core/types.js";
import type { ContinentBounds, LandmassConfig, MountainsConfig, VolcanoesConfig } from "../../bootstrap/types.js";
import type { StepRegistry } from "../../pipeline/index.js";
import { createCoastlinesStep } from "./CoastlinesStep.js";
import { createIslandsStep } from "./IslandsStep.js";
import { createLandmassPlatesStep } from "./LandmassStep.js";
import { createMountainsStep } from "./MountainsStep.js";
import { createRuggedCoastsStep } from "./RuggedCoastsStep.js";
import { createVolcanoesStep } from "./VolcanoesStep.js";

export interface MorphologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
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
  const stageFlags = runtime.stageFlags;

  registry.register(
    createLandmassPlatesStep(
      {
        landmassCfg: runtime.landmassCfg,
        westContinent: runtime.westContinent,
        eastContinent: runtime.eastContinent,
      },
      {
        ...runtime.getStageDescriptor("landmassPlates"),
        shouldRun: () => stageFlags.landmassPlates,
      }
    )
  );

  registry.register(
    createCoastlinesStep({
      ...runtime.getStageDescriptor("coastlines"),
      shouldRun: () => stageFlags.coastlines,
    })
  );

  registry.register(
    createRuggedCoastsStep({
      ...runtime.getStageDescriptor("ruggedCoasts"),
      shouldRun: () => stageFlags.ruggedCoasts,
    })
  );

  registry.register(
    createIslandsStep({
      ...runtime.getStageDescriptor("islands"),
      shouldRun: () => stageFlags.islands,
    })
  );

  registry.register(
    createMountainsStep(
      { logPrefix: runtime.logPrefix, mountainOptions: runtime.mountainOptions },
      {
        ...runtime.getStageDescriptor("mountains"),
        shouldRun: () => stageFlags.mountains,
      }
    )
  );

  registry.register(
    createVolcanoesStep(
      { volcanoOptions: runtime.volcanoOptions },
      {
        ...runtime.getStageDescriptor("volcanoes"),
        shouldRun: () => stageFlags.volcanoes,
      }
    )
  );
}
