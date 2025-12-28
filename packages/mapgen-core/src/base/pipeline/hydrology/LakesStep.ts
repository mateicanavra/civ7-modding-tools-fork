<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/hydrology/LakesStep.ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import { publishHeightfieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/engine/index.js";
import type { MapInfo } from "@civ7/adapter";
import { EmptyStepConfigSchema } from "@mapgen/engine/step-config.js";
========
export { createLakesStep } from "@mapgen/base/pipeline/hydrology/LakesStep.js";
export type { LakesStepOptions, LakesStepRuntime } from "@mapgen/base/pipeline/hydrology/LakesStep.js";
>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/hydrology/LakesStep.ts

