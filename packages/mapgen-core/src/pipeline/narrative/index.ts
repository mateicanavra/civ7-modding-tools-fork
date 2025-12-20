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
  stageFlags: Record<string, boolean>;
  logPrefix: string;
}

export function registerNarrativeLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: NarrativeLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register(
    createStorySeedStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storySeed"),
        shouldRun: () => stageFlags.storySeed,
      }
    )
  );

  registry.register(
    createStoryHotspotsStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storyHotspots"),
        shouldRun: () => stageFlags.storyHotspots,
      }
    )
  );

  registry.register(
    createStoryRiftsStep(
      { logPrefix: runtime.logPrefix },
      {
        ...runtime.getStageDescriptor("storyRifts"),
        shouldRun: () => stageFlags.storyRifts,
      }
    )
  );

  registry.register(
    createStoryOrogenyStep({
      ...runtime.getStageDescriptor("storyOrogeny"),
      shouldRun: () => stageFlags.storyOrogeny,
    })
  );

  registry.register(
    createStoryCorridorsPreStep({
      ...runtime.getStageDescriptor("storyCorridorsPre"),
      shouldRun: () => stageFlags.storyCorridorsPre,
    })
  );

  registry.register(
    createStorySwatchesStep({
      ...runtime.getStageDescriptor("storySwatches"),
      shouldRun: () => stageFlags.storySwatches,
    })
  );

  registry.register(
    createStoryCorridorsPostStep({
      ...runtime.getStageDescriptor("storyCorridorsPost"),
      shouldRun: () => stageFlags.storyCorridorsPost,
    })
  );
}
