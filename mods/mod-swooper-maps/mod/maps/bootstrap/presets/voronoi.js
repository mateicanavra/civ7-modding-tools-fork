// @ts-check
/**
 * Voronoi preset — plate-driven landmass layout using Civ VII WorldModel data.
 */

/** @typedef {import("../map_config.types.js").MapConfig} MapConfig */
/** @typedef {import("../map_config.types.js").Toggles} Toggles */
/** @typedef {import("../map_config.types.js").WorldModel} WorldModelCfg */

/** @type {MapConfig} */
export const VORONOI_PRESET = {
    toggles: /** @type {Toggles} */ ({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
        STORY_ENABLE_WORLDMODEL: true,
    }),
    story: {},
    microclimate: {},
    landmass: {
        geometry: /** @type {import("../map_config.types.js").LandmassGeometry} */ ({
            mode: "plates",
            oceanColumnsScale: 1.0,
            post: {
                expandTiles: 0,
                expandWestTiles: 0,
                expandEastTiles: 0,
            },
        }),
    },
    worldModel: /** @type {WorldModelCfg} */ ({
        enabled: true,
        plates: {
            count: 9,
            relaxationSteps: 6,
            plateRotationMultiple: 5,
            seedOffset: 0,
        },
        policy: {
            oceanSeparation: {
                enabled: true,
                baseSeparationTiles: 3,
                boundaryClosenessMultiplier: 1.4,
                maxPerRowDelta: 4,
                minChannelWidth: 4,
                respectSeaLanes: true,
                edgeWest: {
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                },
                edgeEast: {
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                },
            },
        },
    }),
    dev: /** @type {import("../map_config.types.js").DevLogging} */ ({
        enabled: true,
        logTiming: true,
        logStoryTags: true,
        rainfallHistogram: true,
    }),
};

export default VORONOI_PRESET;
