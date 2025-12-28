<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts
import { Type, type Static } from "typebox";
import type { MapInfo } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StartsConfig } from "@mapgen/bootstrap/types.js";
import { PlacementConfigSchema } from "@mapgen/config/index.js";
import { publishPlacementInputsArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import type { PlacementInputsV1 } from "@mapgen/base/pipeline/placement/placement-inputs.js";
========
export { createDerivePlacementInputsStep } from "@mapgen/base/pipeline/placement/DerivePlacementInputsStep.js";
export type {
  DerivePlacementInputsOptions,
  DerivePlacementInputsRuntime,
} from "@mapgen/base/pipeline/placement/DerivePlacementInputsStep.js";
>>>>>>>> 8e597c31 (M5-U06: extract ecology/placement/narrative pipeline into base mod):packages/mapgen-core/src/pipeline/placement/DerivePlacementInputsStep.ts

