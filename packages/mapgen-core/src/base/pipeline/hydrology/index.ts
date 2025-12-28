<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/hydrology/index.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "@mapgen/engine/index.js";
import {
  createClimateBaselineStep,
  createClimateRefineStep,
  createLakesStep,
  createRiversStep,
} from "@mapgen/base/pipeline/hydrology/steps.js";
========
export { registerHydrologyLayer } from "@mapgen/base/pipeline/hydrology/index.js";
export type { HydrologyLayerRuntime } from "@mapgen/base/pipeline/hydrology/index.js";
>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/hydrology/index.ts

