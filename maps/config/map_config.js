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
        STORY_ENABLE_WORLDMODEL: true,
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
        // Corridor kinds and styles (probabilities are gentle multipliers; consumers must validate)
        kinds: Object.freeze({
            sea: Object.freeze({
                styles: Object.freeze({
                    ocean: Object.freeze({
                        edge: Object.freeze({
                            cliffsChance: 0.15,
                            fjordChance: 0.1,
                        }),
                        features: Object.freeze({
                            reefBias: 0.1,
                        }),
                    }),
                    coastal: Object.freeze({
                        edge: Object.freeze({
                            cliffsChance: 0.25,
                            bayCarveMultiplier: 1.15,
                        }),
                        features: Object.freeze({
                            reefBias: 0.2,
                        }),
                    }),
                }),
            }),
            islandHop: Object.freeze({
                styles: Object.freeze({
                    archipelago: Object.freeze({
                        features: Object.freeze({
                            reefBias: 0.5,
                        }),
                        edge: Object.freeze({
                            shelfReefMultiplier: 1.25,
                        }),
                    }),
                }),
            }),
            land: Object.freeze({
                styles: Object.freeze({
                    desertBelt: Object.freeze({
                        biomes: Object.freeze({
                            desert: 0.7,
                            plains: 0.25,
                            grassland: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            mountainRimChance: 0.4,
                            forestRimChance: 0.1,
                        }),
                    }),
                    plainsBelt: Object.freeze({
                        biomes: Object.freeze({
                            plains: 0.55,
                            grassland: 0.3,
                            desert: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.1,
                            hillRimChance: 0.08,
                        }),
                    }),
                    grasslandBelt: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.6,
                            plains: 0.25,
                            tropical: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.15,
                            hillRimChance: 0.05,
                        }),
                    }),
                    canyon: Object.freeze({
                        biomes: Object.freeze({
                            desert: 0.45,
                            plains: 0.3,
                            grassland: 0.15,
                            tundra: 0.1,
                        }),
                        edge: Object.freeze({
                            cliffChance: 0.6,
                            mountainRimChance: 0.12,
                        }),
                    }),
                    plateau: Object.freeze({
                        biomes: Object.freeze({
                            plains: 0.4,
                            grassland: 0.35,
                            desert: 0.15,
                            tundra: 0.1,
                        }),
                        edge: Object.freeze({
                            escarpmentChance: 0.71,
                            mountainRimChance: 0.08,
                        }),
                    }),
                    flatMtn: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.35,
                            plains: 0.3,
                            tundra: 0.2,
                            desert: 0.15,
                        }),
                        edge: Object.freeze({
                            mountainRimChance: 0.6,
                            forestRimChance: 0.3,
                        }),
                    }),
                }),
            }),
            river: Object.freeze({
                styles: Object.freeze({
                    riverChain: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.6,
                            plains: 0.25,
                            tropical: 0.15,
                        }),
                        features: Object.freeze({
                            floodplainBias: 0.1,
                            forestBias: 0.1,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.15,
                        }),
                    }),
                }),
            }),
        }),
    }),
    // --- World Model (Earth Forces; lightweight, optional) ---
    worldModel: Object.freeze({
        // Master switch for foundational Earth Forces fields (dev-on by default)
        enabled: true,

        // Plates (Voronoi plates + boundary types; fields drive rifts/orogeny/margins)
        plates: Object.freeze({
            count: 8, // Huge maps: 6–10 recommended
            axisAngles: Object.freeze([15, -20, 35]), // degrees; used to align macro trends
            convergenceMix: 0.6, // 0..1 fraction for convergent vs divergent balance
            seedJitter: 3, // tile jitter for plate seeds
            interiorSmooth: 3, // smoothing steps for shield interiors
        }),

        // Global winds (zonal baseline + jet streams; used in refinement upwind checks)
        wind: Object.freeze({
            jetStreaks: 5,
            jetStrength: 1.3,
            variance: 0.6,
            coriolisZonalScale: 1.0,
        }),

        // Ocean currents (basin gyres + boundary currents; small humidity/coast effects)
        currents: Object.freeze({
            basinGyreCountMax: 2,
            westernBoundaryBias: 1.1,
            currentStrength: 3.0,
        }),

        // Mantle pressure (bumps/ridges; optional small influence on hills/relief)
        pressure: Object.freeze({
            bumps: 4,
            amplitude: 0.6,
            scale: 0.4,
        }),

        // Directionality (global cohesion and alignment controls for Earth forces)
        // Purpose: provide cohesive, high-level controls so plates, winds, currents, and rift/orogeny
        // can evolve in concert while remaining varied. These are read by WorldModel and consumers.
        directionality: Object.freeze({
            // Master cohesion dial (0..1): higher = stronger alignment between systems
            cohesion: 0.65,

            // Macro axes in degrees: bias plate motion, prevailing winds, and gyre/currents
            primaryAxes: Object.freeze({
                plateAxisDeg: 20, // macro plate motion axis (deg)
                windBiasDeg: 0, // global wind bias offset (deg)
                currentBiasDeg: -10, // global current gyre bias (deg)
            }),

            // Interplay weights (0..1): how much one system aligns with another
            interplay: Object.freeze({
                windsFollowPlates: 0.4, // jets and streaks tend to align with plate axes
                currentsFollowWinds: 0.6, // surface currents track prevailing winds
                riftsFollowPlates: 0.8, // divergent rifts along plate boundaries
                orogenyOpposesRifts: 0.5, // convergent uplift tends to oppose divergent directions
            }),

            // Hemisphere options and seasonal asymmetry (future-facing)
            hemispheres: Object.freeze({
                southernFlip: false, // flip sign conventions in S hemisphere for winds/currents bias
                equatorBandDeg: 12, // symmetric behavior band around equator
                monsoonBias: 0.3, // seasonal asymmetry placeholder (kept conservative)
            }),

            // Variability knobs to avoid rigid patterns while honoring directionality
            variability: Object.freeze({
                angleJitterDeg: 8, // random jitter around macro axes
                magnitudeVariance: 0.35, // 0..1 variance applied to vector magnitudes
                seedOffset: 0, // RNG stream offset dedicated to directionality
            }),
        }),

        // Policy scalars for consumers (keep gentle; all effects remain clamped/validated)
        policy: Object.freeze({
            windInfluence: 1.0, // scales wind use in refinement upwind barrier checks
            currentHumidityBias: 0.4, // scales coastal humidity tweak from currents
            boundaryFjordBias: 0.3, // scales fjord/bay bias near convergent boundaries
            shelfReefBias: 0.2, // scales passive-shelf reef bias (validated in features)

            // Ocean separation policy (plate-aware; consumed by landmass/coast shaping)
            oceanSeparation: Object.freeze({
                enabled: false, // default off until consumer layer is wired
                // Which continent band pairs to bias apart (0-based indices used by orchestrator):
                // Use [] to disable, or [[0,1],[1,2]] to bias both left–middle and middle–right bands.
                bandPairs: Object.freeze([
                    [0, 1],
                    [1, 2],
                ]),
                // Base lateral push (tiles) applied pre-coast expansion; positive widens oceans
                baseSeparationTiles: 2,
                // Multiplier (0..2) scaling separation near high WorldModel.boundaryCloseness
                boundaryClosenessMultiplier: 1.0,
                // Maximum absolute separation delta per row to preserve robust sea lanes
                maxPerRowDelta: 3,
                // Respect strategic sea lanes and enforce minimum channel width
                respectSeaLanes: true,
                minChannelWidth: 4,
                // Optional outer-edge ocean widening/narrowing (map sides)
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
