// @ts-nocheck
/**
 * Thin wrapper around the consolidated climate refinement engine.
 */
import { refineClimateEarthlike } from "./climate-engine.js";
import { OrogenyCache } from "../story/tagging.js";
import { devLogIf } from "../bootstrap/dev.js";
/**
 * Apply earthlike rainfall refinements after rivers are modeled.
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 */
export function refineRainfallEarthlike(width, height, ctx = null) {
    refineClimateEarthlike(width, height, ctx, { orogenyCache: OrogenyCache });
    devLogIf("LOG_CLIMATE_REFINEMENT", "[Climate] Refinement pass complete");
}
export default refineRainfallEarthlike;
