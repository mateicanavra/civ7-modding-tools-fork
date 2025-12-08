// @ts-nocheck
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
import { STORY_ENABLE_RIFTS, BIOMES_CFG, CORRIDOR_POLICY, } from "../bootstrap/tunables.js";
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
    const LAND_BIAS_STRENGTH = Math.max(0, Math.min(1, CORRIDOR_POLICY?.land?.biomesBiasStrength ?? 0.6));
    const RIVER_BIAS_STRENGTH = Math.max(0, Math.min(1, CORRIDOR_POLICY?.river?.biomesBiasStrength ?? 0.5));
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            const elevation = GameplayMap.getElevation(x, y);
            const rainfall = GameplayMap.getRainfall(x, y);
            // Tundra restraint: require very high lat or extreme elevation and dryness
            if ((lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) &&
                rainfall < TUNDRA_RAIN_MAX) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TundraBiome);
                continue; // lock this decision; skip other nudges
            }
            // Wet, warm coasts near the equator tend tropical
            if (lat < TCOAST_LAT_MAX &&
                GameplayMap.isCoastalLand(x, y) &&
                rainfall > TCOAST_RAIN_MIN) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
            }
            // Temperate/warm river valleys prefer grassland for playability
            if (GameplayMap.isAdjacentToRivers(x, y, 1) &&
                rainfall > RV_RAIN_MIN &&
                lat < RV_LAT_MAX) {
                TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
            }
            // Strategic Corridors: land-open corridor tiles gently bias to grassland (policy-scaled)
            if (StoryTags.corridorLandOpen &&
                StoryTags.corridorLandOpen.has(`${x},${y}`)) {
                if (rainfall > 80 &&
                    lat < 55 &&
                    TerrainBuilder.getRandomNumber(100, "Corridor Land-Open Biome") < Math.round(LAND_BIAS_STRENGTH * 100)) {
                    TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                }
            }
            // Strategic Corridors: river-chain tiles gently bias to grassland (policy-scaled)
            if (StoryTags.corridorRiverChain &&
                StoryTags.corridorRiverChain.has(`${x},${y}`)) {
                if (rainfall > 75 &&
                    lat < 55 &&
                    TerrainBuilder.getRandomNumber(100, "Corridor River-Chain Biome") < Math.round(RIVER_BIAS_STRENGTH * 100)) {
                    TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                }
            }
            // Edge hints near land/river corridors: light vegetation/mountain rim cues (biome-only)
            // Applies to tiles adjacent to a land-open or river-chain corridor, not the corridor tile itself
            {
                if (!(StoryTags.corridorLandOpen?.has?.(`${x},${y}`) ||
                    StoryTags.corridorRiverChain?.has?.(`${x},${y}`))) {
                    let edgeAttr = null;
                    for (let ddy = -1; ddy <= 1 && !edgeAttr; ddy++) {
                        for (let ddx = -1; ddx <= 1; ddx++) {
                            if (ddx === 0 && ddy === 0)
                                continue;
                            const nx = x + ddx;
                            const ny = y + ddy;
                            const nk = `${nx},${ny}`;
                            if (!StoryTags)
                                continue;
                            if (StoryTags.corridorLandOpen?.has?.(nk) ||
                                StoryTags.corridorRiverChain?.has?.(nk)) {
                                const attr = StoryTags.corridorAttributes?.get?.(nk);
                                if (attr && attr.edge)
                                    edgeAttr = attr;
                            }
                        }
                    }
                    if (edgeAttr && edgeAttr.edge) {
                        const edgeCfg = edgeAttr.edge;
                        // Forest rim: bias toward forest-friendly biomes (grassland/tropical) when moist
                        const forestRimChance = Math.max(0, Math.min(1, edgeCfg.forestRimChance ?? 0));
                        if (forestRimChance > 0 &&
                            rainfall > 90 &&
                            TerrainBuilder.getRandomNumber(100, "Corr Forest Rim") < Math.round(forestRimChance * 100)) {
                            const target = lat < 22 && rainfall > 110
                                ? globals.g_TropicalBiome
                                : globals.g_GrasslandBiome;
                            TerrainBuilder.setBiomeType(x, y, target);
                        }
                        // Hill/mountain rim: suggest drier, relief-friendly biomes (plains/tundra in cold/high)
                        const hillRimChance = Math.max(0, Math.min(1, edgeCfg.hillRimChance ?? 0));
                        const mountainRimChance = Math.max(0, Math.min(1, edgeCfg.mountainRimChance ?? 0));
                        const escarpmentChance = Math.max(0, Math.min(1, edgeCfg.escarpmentChance ?? 0));
                        const reliefChance = Math.max(0, Math.min(1, hillRimChance +
                            mountainRimChance +
                            escarpmentChance));
                        if (reliefChance > 0 &&
                            TerrainBuilder.getRandomNumber(100, "Corr Relief Rim") < Math.round(reliefChance * 100)) {
                            // Prefer tundra when very cold/high, else plains (playable with hills)
                            const elev = GameplayMap.getElevation(x, y);
                            const target = (lat > 62 || elev > 800) && rainfall < 95
                                ? globals.g_TundraBiome
                                : globals.g_PlainsBiome;
                            TerrainBuilder.setBiomeType(x, y, target);
                        }
                    }
                }
            }
            // Strategic Corridors: kind/style biome bias (very gentle; policy-scaled)
            {
                const cKey = `${x},${y}`;
                const attr = StoryTags.corridorAttributes?.get?.(cKey);
                const cKind = attr?.kind || (StoryTags.corridorKind && StoryTags.corridorKind.get(cKey));
                const biomesCfg = attr?.biomes;
                if ((cKind === "land" || cKind === "river") && biomesCfg) {
                    const strength = cKind === "land"
                        ? LAND_BIAS_STRENGTH
                        : RIVER_BIAS_STRENGTH;
                    if (strength > 0 &&
                        TerrainBuilder.getRandomNumber(100, "Corridor Kind Bias") < Math.round(strength * 100)) {
                        const entries = Object.keys(biomesCfg);
                        let totalW = 0;
                        for (const k of entries)
                            totalW += Math.max(0, biomesCfg[k] || 0);
                        if (totalW > 0) {
                            let roll = TerrainBuilder.getRandomNumber(totalW, "Corridor Kind Pick");
                            let chosen = entries[0];
                            for (const k of entries) {
                                const w = Math.max(0, biomesCfg[k] || 0);
                                if (roll < w) {
                                    chosen = k;
                                    break;
                                }
                                roll -= w;
                            }
                            let target = null;
                            if (chosen === "desert")
                                target = globals.g_DesertBiome;
                            else if (chosen === "plains")
                                target = globals.g_PlainsBiome;
                            else if (chosen === "grassland")
                                target = globals.g_GrasslandBiome;
                            else if (chosen === "tropical")
                                target = globals.g_TropicalBiome;
                            else if (chosen === "tundra")
                                target = globals.g_TundraBiome;
                            else if (chosen === "snow")
                                target = globals.g_SnowBiome;
                            if (target != null) {
                                // Light sanity gates to avoid extreme mismatches
                                let ok = true;
                                if (target === globals.g_DesertBiome &&
                                    rainfall > 110)
                                    ok = false;
                                if (target === globals.g_TropicalBiome &&
                                    !(lat < 25 && rainfall > 95))
                                    ok = false;
                                if (target === globals.g_TundraBiome &&
                                    !(lat > 60 || elevation > 800))
                                    ok = false;
                                if (target === globals.g_SnowBiome &&
                                    !(lat > 70 || elevation > 900))
                                    ok = false;
                                if (ok) {
                                    TerrainBuilder.setBiomeType(x, y, target);
                                }
                            }
                        }
                    }
                }
            }
            // Climate Story: rift shoulder preference (narrow, moisture-aware)
            if (STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
                const key = `${x},${y}`;
                if (StoryTags.riftShoulder.has(key)) {
                    // Temperate/warm shoulders: prefer grassland when sufficiently moist
                    if (lat < RS_GRASS_LAT_MAX &&
                        rainfall > RS_GRASS_RAIN_MIN) {
                        TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                    }
                    else if (lat < RS_TROP_LAT_MAX &&
                        rainfall > RS_TROP_RAIN_MIN) {
                        // In very warm & wet shoulders, allow tropical bias (still gentle)
                        TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
                    }
                }
            }
        }
    }
}
export default designateEnhancedBiomes;
