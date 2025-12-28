<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts
import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "@mapgen/core/terrain-constants.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
  publishRiverAdjacencyArtifact,
} from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/engine/index.js";
import { ClimateStoryPaleoSchema } from "@mapgen/config/index.js";
import { storyTagClimatePaleo } from "@mapgen-content/narrative/swatches.js";
========
export { createRiversStep } from "@mapgen/base/pipeline/hydrology/RiversStep.js";
export type { RiversStepOptions } from "@mapgen/base/pipeline/hydrology/RiversStep.js";
>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/hydrology/RiversStep.ts

