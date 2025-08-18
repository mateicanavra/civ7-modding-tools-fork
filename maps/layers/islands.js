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
import { STORY_TUNABLES } from "../config/tunables.js";
import { isAdjacentToLand, storyKey } from "../core/utils.js";

/**
 * Place small island clusters in deep water, with hotspot bias.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addIslandChains(iWidth, iHeight) {
    // Sparse mask: use mountain fractal as a high-threshold trigger
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 5, 0);
    const threshold = FractalBuilder.getHeightFromPercent(
        globals.g_HillFractal,
        92,
    );

    // Tunables for hotspot classification and cone “peeking”
    const paradiseWeight = (STORY_TUNABLES?.hotspot?.paradiseBias ?? 2) | 0; // default 2
    const volcanicWeight = (STORY_TUNABLES?.hotspot?.volcanicBias ?? 1) | 0; // default 1
    const peakPercent = Math.max(
        0,
        Math.min(
            100,
            Math.round(
                (STORY_TUNABLES?.hotspot?.volcanicPeakChance ?? 0.33) * 100,
            ),
        ),
    );

    for (let y = 2; y < iHeight - 2; y++) {
        for (let x = 2; x < iWidth - 2; x++) {
            if (!GameplayMap.isWater(x, y)) continue;

            // Keep islands away from existing land to preserve lanes
            if (isAdjacentToLand(x, y, 2)) continue;

            const v = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
            const isHotspot = StoryTags.hotspot.has(storyKey(x, y));

            // Base sparse placement vs. hotspot-biased placement
            const baseAllowed =
                v > threshold &&
                TerrainBuilder.getRandomNumber(8, "Island Seed") === 0;
            const hotspotAllowed =
                isHotspot &&
                TerrainBuilder.getRandomNumber(3, "Hotspot Island Seed") === 0;

            if (!(baseAllowed || hotspotAllowed)) continue;

            // Default to coast water; occasionally let a volcanic center “peek” as land
            let centerTerrain = globals.g_CoastTerrain;
            let classifyParadise = false;

            if (isHotspot) {
                const bucket = paradiseWeight + volcanicWeight;
                const roll = TerrainBuilder.getRandomNumber(
                    bucket || 1,
                    "HotspotKind",
                );
                classifyParadise = roll < paradiseWeight;

                if (!classifyParadise) {
                    // Volcanic: rare cone peeking above sea level
                    if (
                        TerrainBuilder.getRandomNumber(100, "HotspotPeak") <
                        peakPercent
                    ) {
                        centerTerrain = globals.g_FlatTerrain;
                    }
                }
            }

            // Place center tile
            TerrainBuilder.setTerrainType(x, y, centerTerrain);

            // Classify center for downstream microclimates/features
            if (isHotspot) {
                if (classifyParadise) {
                    StoryTags.hotspotParadise.add(storyKey(x, y));
                } else {
                    StoryTags.hotspotVolcanic.add(storyKey(x, y));
                }
            }

            // Create a tiny cluster around the center (smaller for hotspot-biased)
            const maxCluster = isHotspot ? 2 : 3;
            const count =
                1 + TerrainBuilder.getRandomNumber(maxCluster, "Island Size");

            for (let n = 0; n < count; n++) {
                const dx = TerrainBuilder.getRandomNumber(3, "dx") - 1;
                const dy = TerrainBuilder.getRandomNumber(3, "dy") - 1;
                const nx = x + dx;
                const ny = y + dy;

                if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1)
                    continue;
                if (!GameplayMap.isWater(nx, ny)) continue;

                TerrainBuilder.setTerrainType(nx, ny, globals.g_CoastTerrain);
            }
        }
    }
}

export default addIslandChains;
