/**
 * Climate Engine — centralizes rainfall staging passes so the orchestrator and
 * narrative overlays operate against a single shared module.
 */

import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/baseline.js";
import { applyClimateSwatches } from "@mapgen/domain/hydrology/climate/swatches/index.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/refine/index.js";

export type {
  ClimateAdapter,
  ClimateConfig,
  ClimateRuntime,
  ClimateSwatchResult,
  OrogenyCache,
} from "@mapgen/domain/hydrology/climate/types.js";

export { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/baseline.js";
export { applyClimateSwatches } from "@mapgen/domain/hydrology/climate/swatches/index.js";
export { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/refine/index.js";

export default {
  applyClimateBaseline,
  applyClimateSwatches,
  refineClimateEarthlike,
};
