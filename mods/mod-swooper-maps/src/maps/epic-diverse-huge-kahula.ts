// @ts-nocheck
/**
 * Epic Diverse Huge — Kahula (Entry Variant)
 *
 * A dramatically different tectonic configuration built entirely via config:
 * - One large, central “blobular” continent
 * - A massive convergent ridge running roughly north–south across the interior
 * - Divergent rifts flanking the central mass (east and west sides)
 * - Outer bands are mostly open ocean with only small island chains
 *
 * Notes:
 * - Listed as a separate <Row> in config/config.xml.
 * - Uses the standard generator; only presets/overrides differ.
 */

console.log("[EpicDiverseHuge:Kahula] Loading entry...");

import { bootstrap } from "./config/entry.js";

// @ts-check
/** @typedef {import("../maps/config/map_config.d.ts").MapConfig} Config */

bootstrap({
    // Start from conservative defaults
    presets: ["classic"],
    // Kahula-specific overrides to bias plate layout and band geometry

    /** @type Config */
    overrides: {
        toggles: {
            STORY_ENABLE_HOTSPOTS: true,
            STORY_ENABLE_RIFTS: true,
            STORY_ENABLE_OROGENY: true,
            STORY_ENABLE_WORLDMODEL: true,
            STORY_ENABLE_SWATCHES: true,
            STORY_ENABLE_CORRIDORS: true,
        },
        // Landmass geometry: wide central band (blob continent), narrow outer bands
        landmass: {
            baseWaterPercent: 65,
            waterThumbOnScale: -5,
            curveAmpFrac: 0.35,
            geometry: {
                preset: "kahula",
                oceanColumnsScale: 1.2,
                presets: {
                    kahula: {
                        bands: [
                            // Left band: narrow; mostly ocean with tiny coastal land
                            {
                                westFrac: 0.05,
                                eastFrac: 0.18,
                                westOceanOffset: 1.2,
                                eastOceanOffset: -0.64,
                            },
                            // Middle band: wide central “blob”
                            {
                                westFrac: 0.28,
                                eastFrac: 0.72,
                                westOceanOffset: 0.0,
                                eastOceanOffset: 0.0,
                            },
                            // Right band: narrow; mostly ocean with tiny coastal land
                            {
                                westFrac: 0.82,
                                eastFrac: 0.95,
                                westOceanOffset: 0.53,
                                eastOceanOffset: -1.2,
                            },
                        ],
                    },
                },
            },
        },
        biomes: {
            tundra: {
                elevMin: 100,
            },
        },
        climateBaseline: {
            bands: {
                deg0to10: 200,
                deg10to20: 150,
                deg70plus: 50,
            },
            orographic: {
                hi1Threshold: 280,
                hi2Threshold: 380,
                hi2Bonus: 200,
            },
        },
        islands: {
            minDistFromLandRadius: 3,
        },
        // Tectonics and directionality tuned for a central ridge with flanking rifts
        worldModel: {
            enabled: true,
            wind: {
                coriolisZonalScale: 2.3,
                jetStreaks: 3,
            },
            plates: {
                count: 5,
                axisAngles: [23, -17],
                convergenceMix: 2,
                seedJitter: 2,
                interiorSmooth: 3,
            },
            directionality: {
                cohesion: 0.9,
                primaryAxes: {
                    // East–west plate motion tends to produce north–south belts
                    plateAxisDeg: 70,
                    windBiasDeg: 130,
                    currentBiasDeg: 70,
                },
                interplay: {
                    windsFollowPlates: 0.7,
                    currentsFollowWinds: 0.8,
                    riftsFollowPlates: 0.9,
                    orogenyOpposesRifts: 0.6,
                },
                hemispheres: {
                    southernFlip: true,
                    equatorBandDeg: 38,
                    monsoonBias: 1.3,
                },
                variability: {
                    angleJitterDeg: 5,
                    magnitudeVariance: 0.2,
                    seedOffset: 1,
                },
            },
            policy: {
                // Ensure open oceans around the central landmass and keep lanes open
                oceanSeparation: {
                    enabled: true,
                    bandPairs: [
                        [0, 1],
                        [1, 2],
                    ],
                    baseSeparationTiles: 3,
                    boundaryClosenessMultiplier: 1.5,
                    maxPerRowDelta: 3,
                    respectSeaLanes: true,
                    minChannelWidth: 5,
                    edgeWest: {
                        enabled: true,
                        baseTiles: 1,
                        boundaryClosenessMultiplier: 1.0,
                        maxPerRowDelta: 6,
                    },
                    edgeEast: {
                        enabled: true,
                        baseTiles: 1,
                        boundaryClosenessMultiplier: 1.0,
                        maxPerRowDelta: 6,
                    },
                },
            },
        },
        // Encourage a pair of long rifts and a prominent orogenic belt
        story: {
            rift: {
                maxRiftsPerMap: 3,
                lineSteps: 20,
                stepLen: 3,
                shoulderWidth: 6,
            },
            orogeny: {
                beltMaxPerContinent: 1,
                beltMinLength: 60,
                radius: 3,
                windwardBoost: 180,
                leeDrynessAmplifier: 1.4,
            },
            swatches: {
                forceAtLeastOne: true,
                maxPerMap: 7,
                sizeScaling: {
                    lengthMulSqrt: 5,
                    widthMulSqrt: 2,
                },
                types: {
                    macroDesertBelt: {
                        weight: 10,
                        bleedRadius: 4,
                    },
                    mountainForests: {
                        coupleToOrogeny: true,
                        weight: 10,
                    },
                },
            },
        },
    },
});
import "./map_orchestrator.js";

console.log(
    "[EpicDiverseHuge:Kahula] Ready (delegating to Epic Diverse Huge generator).",
);
