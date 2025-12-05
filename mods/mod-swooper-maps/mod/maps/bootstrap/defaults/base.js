// @ts-nocheck
/**
 * Base defaults for Epic Diverse Huge map configs.
 *
 * Purpose
 * - Single, explicit source for baseline defaults that all consumers compose from.
 * - These values form the canonical defaults (no other hidden defaults elsewhere).
 *
 * Notes
 * - Keep objects frozen to discourage mutation and encourage override/merge patterns.
 * - Arrays are provided as plain arrays; resolver will treat arrays as replace-by-default.
 */
// @ts-check
const CLIMATE_BASELINE_DEFAULT = Object.freeze({
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
});
const CLIMATE_REFINE_DEFAULT = Object.freeze({
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
});
const CLIMATE_SWATCHES_DEFAULT = Object.freeze({
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
});

const LANDMASS_DEFAULT = Object.freeze({
    baseWaterPercent: 64,
    waterThumbOnScale: -4,
    jitterAmpFracBase: 0.03,
    jitterAmpFracScale: 0.015,
    curveAmpFrac: 0.05,
    boundaryBias: 0.6,
    boundaryShareTarget: 0.25,
    geometry: Object.freeze({
        post: Object.freeze({
            expandTiles: 0,
            expandWestTiles: 0,
            expandEastTiles: 0,
        }),
    }),
});

const FOUNDATION_SEED_DEFAULT = Object.freeze({
    mode: "engine",
    fixed: null,
    offset: 0,
    offsets: Object.freeze({
        plates: 0,
        dynamics: 0,
        surface: 0,
        diagnostics: 0,
    }),
    manifestHash: null,
});

const FOUNDATION_PLATES_DEFAULT = Object.freeze({
    seedMode: "engine",
    count: 8,
    axisAngles: Object.freeze([15, -20, 35]),
    convergenceMix: 0.6,
    relaxationSteps: 5,
    seedJitter: 3,
    interiorSmooth: 3,
    plateRotationMultiple: 5,
    seedOffset: 0,
});

const FOUNDATION_WIND_DEFAULT = Object.freeze({
    jetStreaks: 5,
    jetStrength: 1.75,
    variance: 0.6,
    coriolisZonalScale: 1.0,
});

const FOUNDATION_CURRENTS_DEFAULT = Object.freeze({
    basinGyreCountMax: 2,
    westernBoundaryBias: 1.1,
    currentStrength: 4.0,
});

const FOUNDATION_MANTLE_DEFAULT = Object.freeze({
    bumps: 7,
    amplitude: 0.75,
    scale: 0.4,
});

const FOUNDATION_DIRECTIONALITY_DEFAULT = Object.freeze({
    cohesion: 0.45,
    primaryAxes: Object.freeze({
        plateAxisDeg: 0,
        windBiasDeg: 260,
        currentBiasDeg: -5,
    }),
    interplay: Object.freeze({
        windsFollowPlates: 0.55,
        currentsFollowWinds: 0.7,
        riftsFollowPlates: 0.75,
        orogenyOpposesRifts: 0.55,
    }),
    hemispheres: Object.freeze({
        southernFlip: true,
        equatorBandDeg: 18,
        monsoonBias: 0.6,
    }),
    variability: Object.freeze({
        angleJitterDeg: 15,
        magnitudeVariance: 0.45,
        seedOffset: 0,
    }),
});

const FOUNDATION_OCEAN_SEPARATION_DEFAULT = Object.freeze({
    enabled: false,
    bandPairs: Object.freeze([
        [0, 1],
        [1, 2],
    ]),
    baseSeparationTiles: 2,
    boundaryClosenessMultiplier: 1.0,
    maxPerRowDelta: 3,
    respectSeaLanes: true,
    minChannelWidth: 4,
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
});

const FOUNDATION_POLICY_DEFAULT = Object.freeze({
    windInfluence: 1.0,
    currentHumidityBias: 0.4,
    boundaryFjordBias: 0.3,
    shelfReefBias: 0.2,
    oceanSeparation: FOUNDATION_OCEAN_SEPARATION_DEFAULT,
});

const FOUNDATION_SURFACE_DEFAULT = Object.freeze({
    landmass: LANDMASS_DEFAULT,
    oceanSeparation: FOUNDATION_OCEAN_SEPARATION_DEFAULT,
    overrides: Object.freeze({}),
});

const FOUNDATION_DYNAMICS_DEFAULT = Object.freeze({
    wind: FOUNDATION_WIND_DEFAULT,
    currents: FOUNDATION_CURRENTS_DEFAULT,
    mantle: FOUNDATION_MANTLE_DEFAULT,
    directionality: FOUNDATION_DIRECTIONALITY_DEFAULT,
});

const FOUNDATION_DIAGNOSTICS_DEFAULT = Object.freeze({
    logSeed: false,
    logPlates: false,
    logDynamics: false,
    logSurface: false,
});

const FOUNDATION_DEFAULT = Object.freeze({
    seed: FOUNDATION_SEED_DEFAULT,
    plates: FOUNDATION_PLATES_DEFAULT,
    dynamics: FOUNDATION_DYNAMICS_DEFAULT,
    surface: FOUNDATION_SURFACE_DEFAULT,
    policy: FOUNDATION_POLICY_DEFAULT,
    diagnostics: FOUNDATION_DIAGNOSTICS_DEFAULT,
});

export const BASE_CONFIG = /** @type {import('../map_config.types.js').MapConfig} */ Object.freeze({
    // --- Master Feature Toggles ---
    // Enable or disable major Climate Story systems. Set to false to skip a layer entirely.
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: false,
        STORY_ENABLE_RIFTS: false,
        STORY_ENABLE_OROGENY: false,
        STORY_ENABLE_SWATCHES: false,
        STORY_ENABLE_PALEO: false,
        STORY_ENABLE_CORRIDORS: false,
    }),
    // --- Climate aggregates (baseline + refinement + swatches) ---
    climate: Object.freeze({
        baseline: CLIMATE_BASELINE_DEFAULT,
        refine: CLIMATE_REFINE_DEFAULT,
        swatches: CLIMATE_SWATCHES_DEFAULT,
    }),
    // --- Stage Manifest ---
    // Canonical execution order and dependency graph for generator stages.
    stageManifest: Object.freeze({
        order: Object.freeze([
            "foundation",
            "landmassPlates",
            "coastlines",
            "storySeed",
            "storyHotspots",
            "storyRifts",
            "storyOrogeny",
            "storyPaleo",
            "storyCorridorsPre",
            "islands",
            "mountains",
            "volcanoes",
            "lakes",
            "climateBaseline",
            "storySwatches",
            "rivers",
            "storyCorridorsPost",
            "climateRefine",
            "biomes",
            "features",
            "placement",
        ]),
        stages: Object.freeze({
            foundation: Object.freeze({
                enabled: true,
                provides: Object.freeze([
                    "foundationContext",
                    "plates",
                    "wind",
                    "currents",
                    "mantle",
                    "directionality",
                ]),
            }),
            landmassPlates: Object.freeze({
                enabled: true,
                requires: Object.freeze(["foundation"]),
                provides: Object.freeze(["continents", "plateWindows", "heightfield"]),
            }),
            coastlines: Object.freeze({
                enabled: true,
                requires: Object.freeze(["landmassPlates"]),
                provides: Object.freeze(["expandedCoasts", "heightfield"]),
            }),
            storySeed: Object.freeze({
                enabled: true,
                requires: Object.freeze(["coastlines"]),
                provides: Object.freeze(["storyTags", "marginTags"]),
            }),
            storyHotspots: Object.freeze({
                enabled: false,
                requires: Object.freeze(["storySeed", "foundation"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_HOTSPOTS"]),
            }),
            storyRifts: Object.freeze({
                enabled: false,
                requires: Object.freeze(["storySeed", "foundation"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_RIFTS"]),
            }),
            storyOrogeny: Object.freeze({
                enabled: false,
                requires: Object.freeze(["storySeed", "foundation"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_OROGENY"]),
            }),
            storyPaleo: Object.freeze({
                enabled: false,
                requires: Object.freeze(["storySeed"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_PALEO"]),
            }),
            storyCorridorsPre: Object.freeze({
                enabled: false,
                requires: Object.freeze(["storySeed"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_CORRIDORS"]),
            }),
            islands: Object.freeze({
                enabled: true,
                requires: Object.freeze(["storySeed"]),
                provides: Object.freeze(["heightfield"]),
            }),
            mountains: Object.freeze({
                enabled: true,
                requires: Object.freeze(["landmassPlates"]),
                provides: Object.freeze(["mountainHeights", "hillHeights", "heightfield"]),
            }),
            volcanoes: Object.freeze({
                enabled: true,
                requires: Object.freeze(["mountains"]),
                provides: Object.freeze(["volcanoes", "heightfield"]),
            }),
            lakes: Object.freeze({
                enabled: true,
                requires: Object.freeze(["mountains"]),
                provides: Object.freeze(["heightfield"]),
            }),
            climateBaseline: Object.freeze({
                enabled: true,
                requires: Object.freeze(["mountains"]),
                provides: Object.freeze(["rainfallBaseline", "climateField"]),
            }),
            storySwatches: Object.freeze({
                enabled: false,
                requires: Object.freeze(["climateBaseline", "storySeed"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_SWATCHES"]),
            }),
            rivers: Object.freeze({
                enabled: true,
                requires: Object.freeze(["climateBaseline"]),
                provides: Object.freeze(["rivers"]),
            }),
            storyCorridorsPost: Object.freeze({
                enabled: false,
                requires: Object.freeze(["rivers", "storyCorridorsPre"]),
                legacyToggles: Object.freeze(["STORY_ENABLE_CORRIDORS"]),
            }),
            climateRefine: Object.freeze({
                enabled: true,
                requires: Object.freeze(["climateBaseline", "rivers"]),
                provides: Object.freeze(["rainfallRefined", "climateField"]),
            }),
            biomes: Object.freeze({
                enabled: true,
                requires: Object.freeze(["climateRefine"]),
                provides: Object.freeze(["biomes"]),
            }),
            features: Object.freeze({
                enabled: true,
                requires: Object.freeze(["biomes"]),
                provides: Object.freeze(["features"]),
            }),
            placement: Object.freeze({
                enabled: true,
                requires: Object.freeze(["features"]),
                provides: Object.freeze(["starts", "resources", "discoveries"]),
            }),
        }),
    }),
    // --- World Foundation (seed + physics controls) ---
    foundation: FOUNDATION_DEFAULT,
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
        swatches: CLIMATE_SWATCHES_DEFAULT,
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
    // --- Landmass (base land/ocean and shaping) ---
    landmass: LANDMASS_DEFAULT,
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
        plateBias: Object.freeze({
            threshold: 0.45,
            power: 1.25,
            convergent: 1.0,
            transform: 0.4,
            divergent: -0.6,
            interior: 0,
            bayWeight: 0.35,
            bayNoiseBonus: 1.0,
            fjordWeight: 0.8,
        }),
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
    // --- Mountains & Hills (WorldModel-driven) ---
    mountains: Object.freeze({
        mountainPercent: 3,
        hillPercent: 8,
        upliftWeight: 0.6,
        fractalWeight: 0.4,
        riftDepth: 0.25,
        variance: 1.6,
        boundaryWeight: 0.85,
        boundaryExponent: 1.3,
        interiorPenaltyWeight: 0.18,
        convergenceBonus: 0.65,
        transformPenalty: 0.25,
        riftPenalty: 0.65,
        hillBoundaryWeight: 0.4,
        hillRiftBonus: 0.45,
        hillConvergentFoothill: 0.22,
        hillInteriorFalloff: 0.2,
        hillUpliftWeight: 0.3,
    }),
    volcanoes: Object.freeze({
        enabled: true,
        baseDensity: 1 / 170,
        minSpacing: 3,
        boundaryThreshold: 0.35,
        boundaryWeight: 1.2,
        convergentMultiplier: 2.4,
        transformMultiplier: 1.1,
        divergentMultiplier: 0.35,
        hotspotWeight: 0.12,
        shieldPenalty: 0.6,
        randomJitter: 0.08,
        minVolcanoes: 5,
        maxVolcanoes: 40,
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
    // --- Dev logger defaults (ON for development) ---
    // These feed the resolved config; dev.js will be aligned to read from them.
    dev: Object.freeze({
        enabled: true,
        logTiming: true,
        logStoryTags: true,
        rainfallHistogram: true,
        LOG_FOUNDATION_SUMMARY: true,
        LOG_FOUNDATION_ASCII: true,
        LOG_FOUNDATION_SEED: true,
        LOG_FOUNDATION_PLATES: true,
        LOG_BOUNDARY_METRICS: true,
        LOG_LANDMASS_ASCII: true,
        LOG_LANDMASS_WINDOWS: true,
        LOG_RELIEF_ASCII: true,
        LOG_MOUNTAINS: true,
    }),
});
export default BASE_CONFIG;
