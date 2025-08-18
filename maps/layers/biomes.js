/**
 * Biomes Layer — designateEnhancedBiomes
 *
 * Purpose
 * - Start with base-standard biome assignment, then apply light, climate-aware
 *   nudges for playability and realism.
 * - Includes a narrow preference along rift shoulders to suggest fertile
 *   corridor edges without overriding vanilla eligibility rules.
 *
 * Behavior
 * - Base biomes: delegated to engine (vanilla-compatible).
 * - Tundra restraint: only at very high latitude or extreme elevation when dry.
 * - Tropical encouragement: wet, warm coasts near the equator.
 * - River-valley playability: temperate/warm river-adjacent tiles trend grassland.
 * - Rift shoulder bias: temperate/warm shoulder tiles prefer grassland when moist.
 *
 * Invariants
 * - Does not bypass engine constraints beyond setting biome types.
 * - Keeps adjustments modest; does not interfere with feature validation rules.
 * - O(width × height) with simple local checks.
 */

import { designateBiomes as baseDesignateBiomes } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_RIFTS, BIOMES_CFG } from "../config/tunables.js";

/**
 * Enhanced biome designation with gentle, readable nudges.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function designateEnhancedBiomes(iWidth, iHeight) {
    console.log("Creating enhanced biome diversity (climate-aware)...");

    // Start with vanilla-consistent biomes
    baseDesignateBiomes(iWidth, iHeight);

    // Apply small, climate-aware preferences
    const _bcfg = BIOMES_CFG || {};
    const _tundra = _bcfg.tundra || {};
    const TUNDRA_LAT_MIN = Number.isFinite(_tundra.latMin)
        ? _tundra.latMin
        : 70;
    const TUNDRA_ELEV_MIN = Number.isFinite(_tundra.elevMin)
        ? _tundra.elevMin
        : 850;
    const TUNDRA_RAIN_MAX = Number.isFinite(_tundra.rainMax)
        ? _tundra.rainMax
        : 90;

    const _tcoast = _bcfg.tropicalCoast || {};
    const TCOAST_LAT_MAX = Number.isFinite(_tcoast.latMax)
        ? _tcoast.latMax
        : 18;
    const TCOAST_RAIN_MIN = Number.isFinite(_tcoast.rainMin)
        ? _tcoast.rainMin
        : 105;

    const _rv = _bcfg.riverValleyGrassland || {};
    const RV_LAT_MAX = Number.isFinite(_rv.latMax) ? _rv.latMax : 50;
    const RV_RAIN_MIN = Number.isFinite(_rv.rainMin) ? _rv.rainMin : 75;

    const _rs = _bcfg.riftShoulder || {};
    const RS_GRASS_LAT_MAX = Number.isFinite(_rs.grasslandLatMax)
        ? _rs.grasslandLatMax
        : 50;
    const RS_GRASS_RAIN_MIN = Number.isFinite(_rs.grasslandRainMin)
        ? _rs.grasslandRainMin
        : 75;
    const RS_TROP_LAT_MAX = Number.isFinite(_rs.tropicalLatMax)
        ? _rs.tropicalLatMax
        : 18;
    const RS_TROP_RAIN_MIN = Number.isFinite(_rs.tropicalRainMin)
        ? _rs.tropicalRainMin
        : 100;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y)) continue;

            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            const elevation = GameplayMap.getElevation(x, y);
            const rainfall = GameplayMap.getRainfall(x, y);

            // Tundra restraint: require very high lat or extreme elevation and dryness
            if (
                (lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) &&
                rainfall < TUNDRA_RAIN_MAX
            ) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TundraBiome);
                continue; // lock this decision; skip other nudges
            }

            // Wet, warm coasts near the equator tend tropical
            if (
                lat < TCOAST_LAT_MAX &&
                GameplayMap.isCoastalLand(x, y) &&
                rainfall > TCOAST_RAIN_MIN
            ) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
            }

            // Temperate/warm river valleys prefer grassland for playability
            if (
                GameplayMap.isAdjacentToRivers(x, y, 1) &&
                rainfall > RV_RAIN_MIN &&
                lat < RV_LAT_MAX
            ) {
                TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
            }

            // Climate Story: rift shoulder preference (narrow, moisture-aware)
            if (STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
                const key = `${x},${y}`;
                if (StoryTags.riftShoulder.has(key)) {
                    // Temperate/warm shoulders: prefer grassland when sufficiently moist
                    if (
                        lat < RS_GRASS_LAT_MAX &&
                        rainfall > RS_GRASS_RAIN_MIN
                    ) {
                        TerrainBuilder.setBiomeType(
                            x,
                            y,
                            globals.g_GrasslandBiome,
                        );
                    } else if (
                        lat < RS_TROP_LAT_MAX &&
                        rainfall > RS_TROP_RAIN_MIN
                    ) {
                        // In very warm & wet shoulders, allow tropical bias (still gentle)
                        TerrainBuilder.setBiomeType(
                            x,
                            y,
                            globals.g_TropicalBiome,
                        );
                    }
                }
            }
        }
    }
}

export default designateEnhancedBiomes;
