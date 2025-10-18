// @ts-nocheck
/**
 * Voronoi preset — plate-driven landmass layout using Civ VII WorldModel data.
 *
 * Purpose
 * - Enable plate-aware layout/spacing while keeping other systems conservative.
 * - Provide sensible defaults for entries that want to lean on Civ VII's tectonics.
 */
// @ts-check

export const VORONOI_PRESET = Object.freeze({
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
        STORY_ENABLE_WORLDMODEL: true,
    }),
    landmass: Object.freeze({
        geometry: Object.freeze({
            mode: "plates",
            oceanColumnsScale: 1.0,
        }),
    }),
    worldModel: Object.freeze({
        enabled: true,
        plates: Object.freeze({
            count: 9,
            relaxationSteps: 6,
            plateRotationMultiple: 5,
            seedOffset: 0,
        }),
        policy: Object.freeze({
            oceanSeparation: Object.freeze({
                enabled: true,
                baseSeparationTiles: 3,
                boundaryClosenessMultiplier: 1.4,
                maxPerRowDelta: 4,
                minChannelWidth: 4,
                respectSeaLanes: true,
                edgeWest: Object.freeze({
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                }),
                edgeEast: Object.freeze({
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                }),
            }),
        }),
    }),
    dev: Object.freeze({
        enabled: true,
        logTiming: true,
        logStoryTags: true,
        rainfallHistogram: true,
    }),
});

export default VORONOI_PRESET;
