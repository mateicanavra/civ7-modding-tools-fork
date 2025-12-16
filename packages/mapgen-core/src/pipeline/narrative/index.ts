import type { ExtendedMapContext } from "../../core/types.js";
import type { StepRegistry } from "../index.js";
import { createStoryCorridorsPostStep, createStoryCorridorsPreStep } from "./StoryCorridorsStep.js";
import { createStoryHotspotsStep } from "./StoryHotspotsStep.js";
import { createStoryOrogenyStep } from "./StoryOrogenyStep.js";
import { createStoryRiftsStep } from "./StoryRiftsStep.js";
import { createStorySeedStep } from "./StorySeedStep.js";
import { createStorySwatchesStep } from "./StorySwatchesStep.js";

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
