// @ts-nocheck
/**
 * Islands Layer — addIslandChains
 *
 * Seeds tiny offshore island clusters using a sparse fractal mask, with
 * additional alignment/bias along previously tagged hotspot trails to create
 * legible chains. Some hotspot centers are classified as “paradise” (reef‑friendly,
 * lusher), others as “volcanic” (occasional cone peeking above the sea; tougher
 * vegetation nearby). Feature/biome micro-tweaks occur in other layers; this
 * module only handles terrain placement and StoryTag classification.
 *
 * Guardrails
 * - Preserves open sea lanes by avoiding tiles within a small radius of land.
 * - Keeps clusters tiny (1–3 tiles; 1–2 when hotspot‑biased).
 * - Leaves heavy validation to feature layers (reefs/vegetation are validated there).
 * - O(width × height) with constant-time local checks.
 */
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_TUNABLES, ISLANDS_CFG, CORRIDORS_CFG, } from "../bootstrap/tunables.js";
import { isAdjacentToLand, storyKey } from "../core/utils.js";
import { ctxRandom } from "../core/types.js";
/**
 * Place small island clusters in deep water, with hotspot bias.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {import('../core/types.js').MapContext} [ctx] - Optional MapContext for adapter-based operations
 */
export function addIslandChains(iWidth, iHeight, ctx) {
    // Sparse mask: use mountain fractal as a high-threshold trigger
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 5, 0);
    const fracPct = (ISLANDS_CFG?.fractalThresholdPercent ?? 90) | 0;
    const threshold = FractalBuilder.getHeightFromPercent(globals.g_HillFractal, Math.max(0, Math.min(100, fracPct)));
    // Tunables for hotspot classification and cone “peeking”
    const paradiseWeight = (STORY_TUNABLES?.hotspot?.paradiseBias ?? 2) | 0; // default 2
    const volcanicWeight = (STORY_TUNABLES?.hotspot?.volcanicBias ?? 1) | 0; // default 1
    const peakPercent = Math.max(0, Math.min(100, Math.round((STORY_TUNABLES?.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10));
    for (let y = 2; y < iHeight - 2; y++) {
        for (let x = 2; x < iWidth - 2; x++) {
            if (!GameplayMap.isWater(x, y))
                continue;
            // Keep islands away from existing land to preserve lanes
            const minDist = (ISLANDS_CFG?.minDistFromLandRadius ?? 2) | 0;
            if (isAdjacentToLand(x, y, Math.max(0, minDist)))
                continue;
            // Respect strategic sea-lane corridors: skip tiles near protected lanes
            const laneRadius = (CORRIDORS_CFG?.sea?.avoidRadius ?? 2) | 0;
            if (laneRadius > 0 &&
                StoryTags.corridorSeaLane &&
                StoryTags.corridorSeaLane.size > 0) {
                let nearSeaLane = false;
                for (let my = -laneRadius; my <= laneRadius && !nearSeaLane; my++) {
                    for (let mx = -laneRadius; mx <= laneRadius; mx++) {
                        const kk = storyKey(x + mx, y + my);
                        if (StoryTags.corridorSeaLane.has(kk)) {
                            nearSeaLane = true;
                            break;
                        }
                    }
                }
                if (nearSeaLane)
                    continue;
            }
            const v = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
            const isHotspot = StoryTags.hotspot.has(storyKey(x, y));
            // Margin context (adjacent coastal segments tagged by margins)
            let nearActive = false;
            let nearPassive = false;
            for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
                for (let mx = -1; mx <= 1; mx++) {
                    if (mx === 0 && my === 0)
                        continue;
                    const k = storyKey(x + mx, y + my);
                    if (!nearActive &&
                        StoryTags.activeMargin &&
                        StoryTags.activeMargin.has(k))
                        nearActive = true;
                    if (!nearPassive &&
                        StoryTags.passiveShelf &&
                        StoryTags.passiveShelf.has(k))
                        nearPassive = true;
                }
            }
            // Base sparse placement vs. hotspot- and margin-biased placement
            const denActive = (ISLANDS_CFG?.baseIslandDenNearActive ?? 5) | 0;
            const denElse = (ISLANDS_CFG?.baseIslandDenElse ?? 7) | 0;
            const baseIslandDen = nearActive ? denActive : denElse; // slightly more islands along active margins
            const baseAllowed = v > threshold &&
                (ctx ? ctxRandom(ctx, "Island Seed", baseIslandDen) : TerrainBuilder.getRandomNumber(baseIslandDen, "Island Seed")) ===
                    0;
            const hotspotAllowed = isHotspot &&
                (ctx ? ctxRandom(ctx, "Hotspot Island Seed", Math.max(1, (ISLANDS_CFG?.hotspotSeedDenom ?? 2) | 0)) : TerrainBuilder.getRandomNumber(Math.max(1, (ISLANDS_CFG?.hotspotSeedDenom ?? 2) | 0), "Hotspot Island Seed")) === 0;
            if (!(baseAllowed || hotspotAllowed))
                continue;
            // Default to coast water; occasionally let a volcanic center “peek” as land
            let centerTerrain = globals.g_CoastTerrain;
            let classifyParadise = false;
            if (isHotspot) {
                // Along passive shelves, slightly bias toward "paradise" centers
                const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
                const vWeight = volcanicWeight;
                const bucket = pWeight + vWeight;
                const roll = ctx ? ctxRandom(ctx, "HotspotKind", bucket || 1) : TerrainBuilder.getRandomNumber(bucket || 1, "HotspotKind");
                classifyParadise = roll < pWeight;
                if (!classifyParadise) {
                    // Volcanic: rare cone peeking above sea level
                    if ((ctx ? ctxRandom(ctx, "HotspotPeak", 100) : TerrainBuilder.getRandomNumber(100, "HotspotPeak")) <
                        peakPercent) {
                        centerTerrain = globals.g_FlatTerrain;
                    }
                }
            }
            // Place center tile
            if (ctx && ctx.adapter) {
                ctx.adapter.setTerrainType(x, y, centerTerrain);
            } else {
                TerrainBuilder.setTerrainType(x, y, centerTerrain);
            }
            // Classify center for downstream microclimates/features
            if (isHotspot) {
                if (classifyParadise) {
                    StoryTags.hotspotParadise.add(storyKey(x, y));
                }
                else {
                    StoryTags.hotspotVolcanic.add(storyKey(x, y));
                }
            }
            // Create a tiny cluster around the center (smaller for hotspot-biased)
            const maxCluster = Math.max(1, (ISLANDS_CFG?.clusterMax ?? 3) | 0);
            const count = 1 + (ctx ? ctxRandom(ctx, "Island Size", maxCluster) : TerrainBuilder.getRandomNumber(maxCluster, "Island Size"));
            for (let n = 0; n < count; n++) {
                const dx = (ctx ? ctxRandom(ctx, "dx", 3) : TerrainBuilder.getRandomNumber(3, "dx")) - 1;
                const dy = (ctx ? ctxRandom(ctx, "dy", 3) : TerrainBuilder.getRandomNumber(3, "dy")) - 1;
                const nx = x + dx;
                const ny = y + dy;
                if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1)
                    continue;
                if (!GameplayMap.isWater(nx, ny))
                    continue;
                if (ctx && ctx.adapter) {
                    ctx.adapter.setTerrainType(nx, ny, globals.g_CoastTerrain);
                } else {
                    TerrainBuilder.setTerrainType(nx, ny, globals.g_CoastTerrain);
                }
            }
        }
    }
}
export default addIslandChains;
