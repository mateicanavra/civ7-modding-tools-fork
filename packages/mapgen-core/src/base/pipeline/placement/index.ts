<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/placement/index.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds, StartsConfig } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { createDerivePlacementInputsStep, createPlacementStep } from "@mapgen/base/pipeline/placement/steps.js";
========
export { registerPlacementLayer } from "@mapgen/base/pipeline/placement/index.js";
export type { PlacementLayerRuntime } from "@mapgen/base/pipeline/placement/index.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/placement/index.ts

