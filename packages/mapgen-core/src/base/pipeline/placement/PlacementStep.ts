<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts
import { type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { runPlacement } from "@mapgen/domain/placement/index.js";
import { resolveNaturalWonderCount } from "@mapgen/domain/placement/wonders.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { EmptyStepConfigSchema } from "@mapgen/pipeline/step-config.js";
import {
  getPublishedPlacementInputs,
  publishPlacementOutputsArtifact,
} from "@mapgen/base/pipeline/artifacts.js";
========
export { createPlacementStep } from "@mapgen/base/pipeline/placement/PlacementStep.js";
export type { PlacementStepOptions, PlacementStepRuntime } from "@mapgen/base/pipeline/placement/PlacementStep.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/placement/PlacementStep.ts

