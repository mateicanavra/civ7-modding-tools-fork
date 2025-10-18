// @ts-nocheck
/**
 * Climate Baseline Layer — buildEnhancedRainfall
 *
 * Purpose
 * - Start from base-standard rainfall, then gently blend in latitude bands
 *   and add small, natural-looking local modifiers.
 *
 * Behavior (unchanged from integrated script logic)
 * - Base rainfall from engine (vanilla expectations preserved)
 * - Latitude bands:
 *     0–10  : very wet
 *     10–20 : wet
 *     20–35 : temperate-dry
 *     35–55 : temperate
 *     55–70 : cool but not barren
 *     70+   : cold/dry
 * - Blend weights: base 60%, band target 40%
 * - Orographic: small elevation-based bonuses
 * - Local water humidity: coastal and shallow-water adjacency boosts
 * - Light noise to break up visible banding
 * - Clamp rainfall to [0, 200] as a hard invariant
 *
 * Performance
 * - O(width × height); single linear pass over tiles.
 */
import { buildRainfallMap } from "/base-standard/maps/elevation-terrain-generator.js";
import { clamp } from "../core/utils.js";
import { CLIMATE_BASELINE_CFG } from "../bootstrap/tunables.js";
/**
 * Build the baseline rainfall map with latitude bands and gentle local modifiers.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function buildEnhancedRainfall(iWidth, iHeight) {
    console.log("Building enhanced rainfall patterns...");
    // Start from the engine’s base rainfall to preserve vanilla assumptions.
    buildRainfallMap(iWidth, iHeight);
    // Apply latitude bands + small local adjustments
    const BASE_AREA = 10000;
    const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(Math.max(1, iWidth * iHeight) / BASE_AREA)));
    const equatorPlus = Math.round(12 * (sqrt - 1)); // +0..+12 on very large maps
    const cfg = CLIMATE_BASELINE_CFG || {};
    const noiseBase = Number.isFinite(cfg?.noise?.baseSpanSmall)
        ? cfg.noise.baseSpanSmall
        : 3;
    const noiseSpan = sqrt > 1
        ? noiseBase +
            Math.round(Number.isFinite(cfg?.noise?.spanLargeScaleFactor)
                ? cfg.noise.spanLargeScaleFactor
                : 1)
        : noiseBase;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            const base = GameplayMap.getRainfall(x, y);
            const elevation = GameplayMap.getElevation(x, y);
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y)); // 0 at equator, 90 at poles
            // Band target by absolute latitude (configurable)
            const bands = cfg.bands || {};
            const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
            const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
            const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
            const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
            const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
            const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;
            let bandRain = 0;
            if (lat < 10)
                bandRain = b0 + equatorPlus;
            else if (lat < 20)
                bandRain = b1 + Math.floor(equatorPlus * 0.6);
            else if (lat < 35)
                bandRain = b2;
            else if (lat < 55)
                bandRain = b3;
            else if (lat < 70)
                bandRain = b4;
            else
                bandRain = b5;
            // Blend: configurable weights (defaults 0.6/0.4)
            const baseW = Number.isFinite(cfg?.blend?.baseWeight)
                ? cfg.blend.baseWeight
                : 0.6;
            const bandW = Number.isFinite(cfg?.blend?.bandWeight)
                ? cfg.blend.bandWeight
                : 0.4;
            let currentRainfall = Math.round(base * baseW + bandRain * bandW);
            // Orographic: mild elevation bonuses (configurable thresholds)
            const oro = cfg.orographic || {};
            const hi1T = Number.isFinite(oro.hi1Threshold)
                ? oro.hi1Threshold
                : 350;
            const hi1B = Number.isFinite(oro.hi1Bonus) ? oro.hi1Bonus : 8;
            const hi2T = Number.isFinite(oro.hi2Threshold)
                ? oro.hi2Threshold
                : 600;
            const hi2B = Number.isFinite(oro.hi2Bonus) ? oro.hi2Bonus : 7;
            if (elevation > hi1T)
                currentRainfall += hi1B;
            if (elevation > hi2T)
                currentRainfall += hi2B;
            // Local water humidity: coast and shallow-water adjacency (configurable)
            const coastalCfg = cfg.coastal || {};
            const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus)
                ? coastalCfg.coastalLandBonus
                : 24;
            const shallowBonus = Number.isFinite(coastalCfg.shallowAdjBonus)
                ? coastalCfg.shallowAdjBonus
                : 16;
            if (GameplayMap.isCoastalLand(x, y))
                currentRainfall += coastalBonus;
            if (GameplayMap.isAdjacentToShallowWater(x, y))
                currentRainfall += shallowBonus;
            // Light noise to avoid striping/banding artifacts (size-aware jitter)
            currentRainfall +=
                TerrainBuilder.getRandomNumber(noiseSpan * 2 + 1, "Rain Noise") - noiseSpan;
            TerrainBuilder.setRainfall(x, y, clamp(currentRainfall, 0, 200));
        }
    }
}
export default buildEnhancedRainfall;
