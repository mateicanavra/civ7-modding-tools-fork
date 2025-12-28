<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/morphology/index.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { StepRegistry } from "@mapgen/engine/index.js";
import {
  createCoastlinesStep,
  createIslandsStep,
  createLandmassPlatesStep,
  createMountainsStep,
  createRuggedCoastsStep,
  createVolcanoesStep,
} from "@mapgen/base/pipeline/morphology/steps.js";
========
export { registerMorphologyLayer } from "@mapgen/base/pipeline/morphology/index.js";
export type { MorphologyLayerRuntime } from "@mapgen/base/pipeline/morphology/index.js";
>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/morphology/index.ts

