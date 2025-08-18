/**
 * @file epic-diverse-huge-map/maps/config/map_config.js
 * @description
 * Central configuration data for the Epic Diverse Huge map generator.
 * This file exports a single object containing all tunable parameters.
 * For schema validation and editor tooltips, see map_config.schema.json.
 *
 * @typedef {import('./map_config.schema.json')} MapConfigSchema
 */

// @ts-check

// Note: For editor autocompletion, prefer a dev-only JSON mirror (map_config.json)
// with "$schema": "./map_config.schema.json". This JS module remains the runtime
// source; avoid importing JSON at runtime in the game environment.
/** @type {import('./map_config.d.ts').MapConfig} */
export const MAP_CONFIG = Object.freeze({
    // $schema: "./map_config.schema.json", // For editor validation

    // --- Master Feature Toggles ---
    // Enable or disable major Climate Story systems. Set to false to skip a layer entirely.
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
    }),

    // --- Climate Story Tunables ---
    // Detailed parameters for each narrative motif.
    story: Object.freeze({
        // Deep-ocean hotspot trails (aligned island chains)
        hotspot: Object.freeze({
            maxTrails: 12, // total trails on a Huge map
            steps: 15, // polyline steps per trail
            stepLen: 2, // tiles advanced per step
            minDistFromLand: 5, // keep trails away from coasts
            minTrailSeparation: 12, // avoid parallel clutter between trails
            paradiseBias: 2, // 2:1 paradise:volcanic selection weight
            volcanicBias: 1,
            volcanicPeakChance: 0.7, // chance a volcanic center "peeks" as land
        }),

        // Continental rift lines (linear inland lakes/shoulders)
        rift: Object.freeze({
            maxRiftsPerMap: 3,
            lineSteps: 18,
            stepLen: 2,
            shoulderWidth: 1,
        }),

        // Orogeny belts (windward/lee amplification along mountain chains)
        orogeny: Object.freeze({
            beltMaxPerContinent: 2,
            beltMinLength: 30,
            radius: 2,
            windwardBoost: 5,
            leeDrynessAmplifier: 1.2,
        }),

        // "Black swan" climate swatches (guaranteed N≈1 macro zone)
        swatches: Object.freeze({
            maxPerMap: 7,
            forceAtLeastOne: true,
            sizeScaling: Object.freeze({
                widthMulSqrt: 0.3,
                lengthMulSqrt: 0.4,
            }),
            types: Object.freeze({
                macroDesertBelt: Object.freeze({
                    weight: 8,
                    latitudeCenterDeg: 20,
                    halfWidthDeg: 12,
                    drynessDelta: 28,
                    bleedRadius: 3,
                }),
                equatorialRainbelt: Object.freeze({
                    weight: 3,
                    latitudeCenterDeg: 0,
                    halfWidthDeg: 10,
                    wetnessDelta: 24,
                    bleedRadius: 3,
                }),
                rainforestArchipelago: Object.freeze({
                    weight: 7,
                    islandBias: 2,
                    reefBias: 1,
                    wetnessDelta: 18,
                    bleedRadius: 3,
                }),
                mountainForests: Object.freeze({
                    weight: 2,
                    coupleToOrogeny: true,
                    windwardBonus: 6,
                    leePenalty: 2,
                    bleedRadius: 3,
                }),
                greatPlains: Object.freeze({
                    weight: 5,
                    latitudeCenterDeg: 45,
                    halfWidthDeg: 8,
                    dryDelta: 12,
                    lowlandMaxElevation: 300,
                    bleedRadius: 4,
                }),
            }),
        }),

        // Paleo‑Hydrology (deltas, oxbows, fossil channels)
        paleo: Object.freeze({
            maxDeltas: 4,
            deltaFanRadius: 1,
            deltaMarshChance: 0.35,
            maxOxbows: 6,
            oxbowElevationMax: 580,
            maxFossilChannels: 12,
            fossilChannelLengthTiles: 12,
            fossilChannelStep: 2,
            fossilChannelHumidity: 6,
            fossilChannelMinDistanceFromCurrentRivers: 4,
            minDistanceFromStarts: 7,
            sizeScaling: Object.freeze({
                lengthMulSqrt: 0.7,
            }),
            elevationCarving: Object.freeze({
                enableCanyonRim: true,
                rimWidth: 4,
                canyonDryBonus: 3,
                bluffWetReduction: 0,
            }),
        }),
    }),

    // --- Microclimate & Feature Adjustments ---
    // Small deltas applied by refinement passes.
    microclimate: Object.freeze({
        rainfall: Object.freeze({
            riftBoost: 8,
            riftRadius: 2,
            paradiseDelta: 6,
            volcanicDelta: 8,
        }),
        features: Object.freeze({
            paradiseReefChance: 23, // % chance
            volcanicForestChance: 27, // % chance
            volcanicTaigaChance: 25, // % chance
        }),
    }),
    // --- Strategic Corridors (sea lanes, island-hop, land, river chains) ---
    corridors: Object.freeze({
        sea: Object.freeze({
            maxLanes: 3,
            minLengthFrac: 0.7,
            scanStride: 6,
            avoidRadius: 2,
            // Scoring and spacing controls
            preferDiagonals: true,
            laneSpacing: 6,
            minChannelWidth: 3,
        }),
        islandHop: Object.freeze({
            useHotspots: true,
            maxArcs: 2,
        }),
        land: Object.freeze({
            useRiftShoulders: true,
            maxCorridors: 5,
            minRunLength: 24,
            spacing: 11,
        }),
        river: Object.freeze({
            maxChains: 2,
            maxSteps: 80,
            preferLowlandBelow: 300,
            coastSeedRadius: 2,
            minTiles: 24,
            mustEndNearCoast: true,
        }),
        // Per-consumer policy strengths and behaviors
        policy: Object.freeze({
            sea: Object.freeze({
                // 'hard' = never edit on lanes; 'soft' = reduce chance instead of skip
                protection: "hard",
                // When protection is 'soft', multiply coast edit probabilities by this factor (0..1)
                softChanceMultiplier: 0.5,
            }),
            land: Object.freeze({
                // 0..1; scales grassland bias strength on land-open corridors
                biomesBiasStrength: 0.6,
            }),
            river: Object.freeze({
                // 0..1; scales grassland bias strength on river-chain corridors
                biomesBiasStrength: 0.5,
            }),
        }),
    }),
    // --- Landmass (base land/ocean and shaping) ---
    landmass: Object.freeze({
        baseWaterPercent: 64,
        waterThumbOnScale: -4,
        jitterAmpFracBase: 0.03,
        jitterAmpFracScale: 0.015,
        curveAmpFrac: 0.05,
    }),
    // --- Coastlines (rugged coasts; lane-safe) ---
    coastlines: Object.freeze({
        bay: Object.freeze({
            noiseGateAdd: 0,
            rollDenActive: 4,
            rollDenDefault: 5,
        }),
        fjord: Object.freeze({
            baseDenom: 12,
            activeBonus: 1,
            passiveBonus: 2,
        }),
        minSeaLaneWidth: 4,
    }),
    // --- Margins (active/passive tagging) ---
    margins: Object.freeze({
        activeFraction: 0.25,
        passiveFraction: 0.25,
        minSegmentLength: 12,
    }),
    // --- Islands (offshore clusters; hotspot bias) ---
    islands: Object.freeze({
        fractalThresholdPercent: 90,
        baseIslandDenNearActive: 5,
        baseIslandDenElse: 7,
        hotspotSeedDenom: 2,
        clusterMax: 3,
        minDistFromLandRadius: 2,
    }),
    // --- Climate Baseline (banded blend + local bonuses) ---
    climateBaseline: Object.freeze({
        blend: Object.freeze({
            baseWeight: 0.6,
            bandWeight: 0.4,
        }),
        bands: Object.freeze({
            deg0to10: 120,
            deg10to20: 104,
            deg20to35: 75,
            deg35to55: 70,
            deg55to70: 60,
            deg70plus: 45,
        }),
        orographic: Object.freeze({
            hi1Threshold: 350,
            hi1Bonus: 8,
            hi2Threshold: 600,
            hi2Bonus: 7,
        }),
        coastal: Object.freeze({
            coastalLandBonus: 24,
            shallowAdjBonus: 16,
        }),
        noise: Object.freeze({
            baseSpanSmall: 3,
            spanLargeScaleFactor: 1.0,
        }),
    }),
    // --- Climate Refinement (earthlike) ---
    climateRefine: Object.freeze({
        waterGradient: Object.freeze({
            radius: 5,
            perRingBonus: 5,
            lowlandBonus: 3,
        }),
        orographic: Object.freeze({
            steps: 4,
            reductionBase: 8,
            reductionPerStep: 6,
        }),
        riverCorridor: Object.freeze({
            lowlandAdjacencyBonus: 14,
            highlandAdjacencyBonus: 5,
        }),
        lowBasin: Object.freeze({
            radius: 3,
            delta: 6,
        }),
    }),
    // --- Biomes (nudges) ---
    biomes: Object.freeze({
        tundra: Object.freeze({
            latMin: 70,
            elevMin: 850,
            rainMax: 90,
        }),
        tropicalCoast: Object.freeze({
            latMax: 18,
            rainMin: 105,
        }),
        riverValleyGrassland: Object.freeze({
            latMax: 50,
            rainMin: 75,
        }),
        riftShoulder: Object.freeze({
            grasslandLatMax: 50,
            grasslandRainMin: 75,
            tropicalLatMax: 18,
            tropicalRainMin: 100,
        }),
    }),
    // --- Features density tweaks (validated) ---
    featuresDensity: Object.freeze({
        rainforestExtraChance: 75,
        forestExtraChance: 20,
        taigaExtraChance: 35,
        shelfReefMultiplier: 0.6,
    }),
    // --- Placement ---
    placement: Object.freeze({
        wondersPlusOne: true,
        floodplains: Object.freeze({
            minLength: 4,
            maxLength: 10,
        }),
    }),
    // --- Dev logger defaults (off for release) ---
    dev: Object.freeze({
        enabled: false,
        logTiming: false,
        logStoryTags: false,
        rainfallHistogram: false,
    }),
});
