<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/narrative/index.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/engine/index.js";
import {
  createStoryCorridorsPostStep,
  createStoryCorridorsPreStep,
} from "@mapgen/base/pipeline/narrative/StoryCorridorsStep.js";
import { createStoryHotspotsStep } from "@mapgen/base/pipeline/narrative/StoryHotspotsStep.js";
import { createStoryOrogenyStep } from "@mapgen/base/pipeline/narrative/StoryOrogenyStep.js";
import { createStoryRiftsStep } from "@mapgen/base/pipeline/narrative/StoryRiftsStep.js";
import { createStorySeedStep } from "@mapgen/base/pipeline/narrative/StorySeedStep.js";
import { createStorySwatchesStep } from "@mapgen/base/pipeline/narrative/StorySwatchesStep.js";
========
export { registerNarrativeLayer } from "@mapgen/base/pipeline/narrative/index.js";
export type { NarrativeLayerRuntime } from "@mapgen/base/pipeline/narrative/index.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/narrative/index.ts

