<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/ecology/index.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import { DEV, logBiomeSummary } from "@mapgen/dev/index.js";
import type { StepRegistry } from "@mapgen/engine/index.js";
import { createBiomesStep, createFeaturesStep } from "@mapgen/base/pipeline/ecology/steps.js";
========
export { registerEcologyLayer } from "@mapgen/base/pipeline/ecology/index.js";
export type { EcologyLayerRuntime } from "@mapgen/base/pipeline/ecology/index.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/ecology/index.ts

