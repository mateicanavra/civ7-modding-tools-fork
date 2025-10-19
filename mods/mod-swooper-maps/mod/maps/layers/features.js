// @ts-nocheck
/**
 * Features Layer — addDiverseFeatures
 *
 * Purpose
 * - Run base-standard feature generation, then apply small, validated, and
 *   climate-aware embellishments that strengthen the narrative:
 *   - Paradise reefs near hotspot paradise centers
 *   - Volcanic vegetation around volcanic centers (forests in warm/wet, taiga in cold/wet)
 *   - Gentle density tweaks for rainforest/forest/taiga in appropriate biomes
 *
 * Guardrails
 * - Always validate placements via TerrainBuilder.canHaveFeature
 * - Resolve feature indices via lookups; skip if unavailable
 * - Keep probabilities conservative and local; never create chokepoints
 * - O(width × height); small neighborhood scans only
 */
import { addFeatures as baseAddFeatures } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_HOTSPOTS, STORY_TUNABLES, FEATURES_DENSITY_CFG, } from "../bootstrap/tunables.js";
import { getFeatureTypeIndex, inBounds } from "../core/utils.js";
import { ctxRandom } from "../core/types.js";
/**
 * Add diverse features with conservative, validated tweaks.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {import('../core/types.js').MapContext} [ctx] - Optional MapContext for adapter-based operations
 */
export function addDiverseFeatures(iWidth, iHeight, ctx) {
    console.log("Adding diverse terrain features...");
    // 1) Base-standard features (vanilla-compatible baseline)
    baseAddFeatures(iWidth, iHeight);
    // 2) Paradise reefs near hotspot paradise centers
    const reefIndex = getFeatureTypeIndex("FEATURE_REEF");
    const paradiseReefChance = STORY_TUNABLES?.features?.paradiseReefChance ?? 18;
    if (STORY_ENABLE_HOTSPOTS &&
        reefIndex !== -1 &&
        StoryTags.hotspotParadise.size > 0 &&
        paradiseReefChance > 0) {
        for (const key of StoryTags.hotspotParadise) {
            const [cx, cy] = key.split(",").map(Number);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (!inBounds(nx, ny))
                        continue;
                    if (!GameplayMap.isWater(nx, ny))
                        continue;
                    if (GameplayMap.getFeatureType(nx, ny) !==
                        FeatureTypes.NO_FEATURE)
                        continue;
                    if ((ctx ? ctxRandom(ctx, "Paradise Reef", 100) : TerrainBuilder.getRandomNumber(100, "Paradise Reef")) <
                        paradiseReefChance) {
                        const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(nx, ny, reefIndex) : TerrainBuilder.canHaveFeature(nx, ny, reefIndex);
                        if (canPlace) {
                            if (ctx && ctx.adapter) {
                                ctx.adapter.setFeatureType(nx, ny, { Feature: reefIndex, Direction: -1, Elevation: 0 });
                            } else {
                                TerrainBuilder.setFeatureType(nx, ny, { Feature: reefIndex, Direction: -1, Elevation: 0 });
                            }
                        }
                    }
                }
            }
        }
    }
    // 2b) Reefs along passive shelves (margin-aware, modest chance)
    if (reefIndex !== -1 &&
        StoryTags.passiveShelf &&
        StoryTags.passiveShelf.size > 0) {
        // Keep this lower than paradise reefs to stay subtle.
        const shelfMult = FEATURES_DENSITY_CFG?.shelfReefMultiplier ?? 0.6;
        const shelfReefChance = Math.max(1, Math.min(100, Math.floor((paradiseReefChance || 18) * shelfMult)));
        for (const key of StoryTags.passiveShelf) {
            const [sx, sy] = key.split(",").map(Number);
            // Tight radius; shelves are linear and we don't want clutter.
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = sx + dx;
                    const ny = sy + dy;
                    if (!inBounds(nx, ny))
                        continue;
                    if (!GameplayMap.isWater(nx, ny))
                        continue;
                    if (GameplayMap.getFeatureType(nx, ny) !==
                        FeatureTypes.NO_FEATURE)
                        continue;
                    if ((ctx ? ctxRandom(ctx, "Shelf Reef", 100) : TerrainBuilder.getRandomNumber(100, "Shelf Reef")) <
                        shelfReefChance) {
                        const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(nx, ny, reefIndex) : TerrainBuilder.canHaveFeature(nx, ny, reefIndex);
                        if (canPlace) {
                            if (ctx && ctx.adapter) {
                                ctx.adapter.setFeatureType(nx, ny, { Feature: reefIndex, Direction: -1, Elevation: 0 });
                            } else {
                                TerrainBuilder.setFeatureType(nx, ny, { Feature: reefIndex, Direction: -1, Elevation: 0 });
                            }
                        }
                    }
                }
            }
        }
    }
    // 3) Per-tile post-pass for gentle density tweaks and volcanic vegetation
    const baseVolcanicForestChance = STORY_TUNABLES?.features?.volcanicForestChance ?? 22;
    const baseVolcanicTaigaChance = STORY_TUNABLES?.features?.volcanicTaigaChance ?? 25;
    // Slight boost to rugged vegetation near volcanic centers (kept conservative)
    const volcanicForestChance = Math.min(100, baseVolcanicForestChance + 6);
    const volcanicTaigaChance = Math.min(100, baseVolcanicTaigaChance + 5);
    const rainforestIdx = getFeatureTypeIndex("FEATURE_RAINFOREST");
    const forestIdx = getFeatureTypeIndex("FEATURE_FOREST");
    const taigaIdx = getFeatureTypeIndex("FEATURE_TAIGA");
    const rainforestExtraChance = FEATURES_DENSITY_CFG?.rainforestExtraChance ?? 55;
    const forestExtraChance = FEATURES_DENSITY_CFG?.forestExtraChance ?? 30;
    const taigaExtraChance = FEATURES_DENSITY_CFG?.taigaExtraChance ?? 35;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            if (GameplayMap.getFeatureType(x, y) !== FeatureTypes.NO_FEATURE)
                continue;
            const biome = GameplayMap.getBiomeType(x, y);
            const elevation = GameplayMap.getElevation(x, y);
            const rainfall = GameplayMap.getRainfall(x, y);
            const plat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            // 3a) Volcanic vegetation near volcanic hotspot centers (radius 1)
            if (STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
                let nearVolcanic = false;
                for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
                    for (let vdx = -1; vdx <= 1; vdx++) {
                        if (vdx === 0 && vdy === 0)
                            continue;
                        const vx = x + vdx;
                        const vy = y + vdy;
                        if (!inBounds(vx, vy))
                            continue;
                        if (StoryTags.hotspotVolcanic.has(`${vx},${vy}`)) {
                            nearVolcanic = true;
                            break;
                        }
                    }
                }
                if (nearVolcanic) {
                    // Warm/wet: bias forest on eligible land
                    if (forestIdx !== -1 &&
                        rainfall > 95 &&
                        (biome === globals.g_GrasslandBiome ||
                            biome === globals.g_TropicalBiome)) {
                        if ((ctx ? ctxRandom(ctx, "Volcanic Forest", 100) : TerrainBuilder.getRandomNumber(100, "Volcanic Forest")) < volcanicForestChance) {
                            const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(x, y, forestIdx) : TerrainBuilder.canHaveFeature(x, y, forestIdx);
                            if (canPlace) {
                                if (ctx && ctx.adapter) {
                                    ctx.adapter.setFeatureType(x, y, { Feature: forestIdx, Direction: -1, Elevation: 0 });
                                } else {
                                    TerrainBuilder.setFeatureType(x, y, { Feature: forestIdx, Direction: -1, Elevation: 0 });
                                }
                                continue; // placed a feature; skip other tweaks on this tile
                            }
                        }
                    }
                    // Cold/wet: bias taiga in suitable tundra pockets
                    if (taigaIdx !== -1 &&
                        plat >= 55 &&
                        biome === globals.g_TundraBiome &&
                        elevation < 400 &&
                        rainfall > 60) {
                        if ((ctx ? ctxRandom(ctx, "Volcanic Taiga", 100) : TerrainBuilder.getRandomNumber(100, "Volcanic Taiga")) < volcanicTaigaChance) {
                            const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(x, y, taigaIdx) : TerrainBuilder.canHaveFeature(x, y, taigaIdx);
                            if (canPlace) {
                                if (ctx && ctx.adapter) {
                                    ctx.adapter.setFeatureType(x, y, { Feature: taigaIdx, Direction: -1, Elevation: 0 });
                                } else {
                                    TerrainBuilder.setFeatureType(x, y, { Feature: taigaIdx, Direction: -1, Elevation: 0 });
                                }
                                continue;
                            }
                        }
                    }
                }
            }
            // 3b) Gentle density tweaks (validated)
            // Enhanced jungle in tropical high-rainfall areas
            if (rainforestIdx !== -1 &&
                biome === globals.g_TropicalBiome &&
                rainfall > 130) {
                if ((ctx ? ctxRandom(ctx, "Extra Jungle", 100) : TerrainBuilder.getRandomNumber(100, "Extra Jungle")) <
                    rainforestExtraChance) {
                    const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(x, y, rainforestIdx) : TerrainBuilder.canHaveFeature(x, y, rainforestIdx);
                    if (canPlace) {
                        if (ctx && ctx.adapter) {
                            ctx.adapter.setFeatureType(x, y, { Feature: rainforestIdx, Direction: -1, Elevation: 0 });
                        } else {
                            TerrainBuilder.setFeatureType(x, y, { Feature: rainforestIdx, Direction: -1, Elevation: 0 });
                        }
                        continue;
                    }
                }
            }
            // Enhanced forests in temperate grasslands
            if (forestIdx !== -1 &&
                biome === globals.g_GrasslandBiome &&
                rainfall > 100) {
                if ((ctx ? ctxRandom(ctx, "Extra Forest", 100) : TerrainBuilder.getRandomNumber(100, "Extra Forest")) <
                    forestExtraChance) {
                    const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(x, y, forestIdx) : TerrainBuilder.canHaveFeature(x, y, forestIdx);
                    if (canPlace) {
                        if (ctx && ctx.adapter) {
                            ctx.adapter.setFeatureType(x, y, { Feature: forestIdx, Direction: -1, Elevation: 0 });
                        } else {
                            TerrainBuilder.setFeatureType(x, y, { Feature: forestIdx, Direction: -1, Elevation: 0 });
                        }
                        continue;
                    }
                }
            }
            // Taiga in cold areas (low elevation)
            if (taigaIdx !== -1 &&
                biome === globals.g_TundraBiome &&
                elevation < 300) {
                if ((ctx ? ctxRandom(ctx, "Extra Taiga", 100) : TerrainBuilder.getRandomNumber(100, "Extra Taiga")) <
                    taigaExtraChance) {
                    const canPlace = ctx && ctx.adapter ? ctx.adapter.canHaveFeature(x, y, taigaIdx) : TerrainBuilder.canHaveFeature(x, y, taigaIdx);
                    if (canPlace) {
                        if (ctx && ctx.adapter) {
                            ctx.adapter.setFeatureType(x, y, { Feature: taigaIdx, Direction: -1, Elevation: 0 });
                        } else {
                            TerrainBuilder.setFeatureType(x, y, { Feature: taigaIdx, Direction: -1, Elevation: 0 });
                        }
                        continue;
                    }
                }
            }
        }
    }
}
export default addDiverseFeatures;
