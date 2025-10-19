// @ts-nocheck
/**
 * Thin wrapper around the consolidated climate engine baseline.
 */
import { applyClimateBaseline } from "./climate-engine.js";
/**
 * Build the baseline rainfall map with latitude bands and gentle local modifiers.
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 */
export function buildEnhancedRainfall(width, height, ctx = null) {
    return applyClimateBaseline(width, height, ctx);
}
export default buildEnhancedRainfall;
