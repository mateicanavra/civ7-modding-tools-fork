/**
 * Climate Engine — centralizes rainfall staging passes so the orchestrator and
 * narrative overlays operate against a single shared module.
 */

import { applyClimateBaseline } from "./baseline.js";
import { applyClimateSwatches } from "./swatches/index.js";
import { refineClimateEarthlike } from "./refine/index.js";

export type {
  ClimateAdapter,
  ClimateConfig,
  ClimateRuntime,
  ClimateSwatchResult,
  OrogenyCache,
} from "./types.js";

export { applyClimateBaseline } from "./baseline.js";
export { applyClimateSwatches } from "./swatches/index.js";
export { refineClimateEarthlike } from "./refine/index.js";

export default {
  applyClimateBaseline,
  applyClimateSwatches,
  refineClimateEarthlike,
};
