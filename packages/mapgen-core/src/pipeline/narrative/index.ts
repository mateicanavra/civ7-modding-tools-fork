import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { createStoryCorridorsPostStep, createStoryCorridorsPreStep } from "@mapgen/pipeline/narrative/StoryCorridorsStep.js";
import { createStoryHotspotsStep } from "@mapgen/pipeline/narrative/StoryHotspotsStep.js";
import { createStoryOrogenyStep } from "@mapgen/pipeline/narrative/StoryOrogenyStep.js";
import { createStoryRiftsStep } from "@mapgen/pipeline/narrative/StoryRiftsStep.js";
import { createStorySeedStep } from "@mapgen/pipeline/narrative/StorySeedStep.js";
import { createStorySwatchesStep } from "@mapgen/pipeline/narrative/StorySwatchesStep.js";

export interface NarrativeLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  logPrefix: string;
}

export function registerNarrativeLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: NarrativeLayerRuntime
): void {
  registry.register(
    createStorySeedStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storySeed"),
      }
    )
  );

  registry.register(
    createStoryHotspotsStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storyHotspots"),
      }
    )
  );

  registry.register(
    createStoryRiftsStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storyRifts"),
      }
    )
  );

  registry.register(
    createStoryOrogenyStep({
      ...runtime.getStageDescriptor("storyOrogeny"),
    })
  );

  registry.register(
    createStoryCorridorsPreStep({
      ...runtime.getStageDescriptor("storyCorridorsPre"),
    })
  );

  registry.register(
    createStorySwatchesStep({
      ...runtime.getStageDescriptor("storySwatches"),
    })
  );

  registry.register(
    createStoryCorridorsPostStep({
      ...runtime.getStageDescriptor("storyCorridorsPost"),
    })
  );
}
